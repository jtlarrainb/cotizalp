// Resuelve el ID de álbum de Spotify para cada disco del catálogo, para poder
// embeber el reproductor oficial (open.spotify.com/embed/album/{id}) en el
// disco "en vitrina" sin exponer credenciales en el navegador: esta búsqueda
// corre solo acá (build/CI), nunca en el cliente.
//
// Requiere una app en https://developer.spotify.com/dashboard (gratis, sin
// necesidad de aprobación) y sus credenciales como variables de entorno:
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//
// Uso:
//   node scripts/fetch-spotify.mjs [--limit=N]
//
// El catálogo tiene ~20k discos únicos; buscarlos todos de una sola corrida es
// lento y puede chocar con rate limits, así que este script:
//   - cachea cada resultado (incluso "no encontrado") en .spotify-cache.json
//     para no volver a buscar lo ya resuelto,
//   - por defecto solo procesa hasta 1500 discos nuevos por corrida (ajustable
//     con --limit), pensado para correr periódicamente vía cron en CI hasta
//     cubrir todo el catálogo, y luego solo ir cubriendo discos nuevos.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = resolve(__dirname, '../src/data/discos.json')
const cachePath = resolve(__dirname, '.spotify-cache.json')

const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 1500

// Presupuesto de tiempo de esta corrida: si Spotify empieza a devolver 429 con
// backoffs largos, preferimos cortar acá, guardar lo avanzado y dejar el resto
// para la próxima corrida (diaria) en vez de quedarnos dormidos hasta el
// timeout del job (6h en GitHub Actions).
const MAX_RUNTIME_MS = 10 * 60 * 1000
// Nunca esperar más que esto por un solo 429, sin importar lo que pida el
// header Retry-After: si Spotify pide más, es señal de cortar la corrida, no
// de dormir esa cantidad.
const MAX_RETRY_AFTER_S = 20
const startedAt = Date.now()

// Discos sin match: no reintentar antes de este plazo (el catálogo de Spotify
// cambia, pero no vale la pena re-buscar algo "no encontrado" en cada corrida).
const RETRY_NOT_FOUND_AFTER_DAYS = 30

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('Faltan SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET en el entorno.')
  process.exit(1)
}

if (!existsSync(dataPath)) {
  console.error(`No se encontró ${dataPath}. Corre antes scripts/build-data.mjs.`)
  process.exit(1)
}

/** @type {{ updatedAt: string|null, albumCount: number, albums: any[] }} */
const catalog = JSON.parse(readFileSync(dataPath, 'utf-8'))

/** @type {Record<string, { spotifyId: string|null, checkedAt: string }>} */
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf-8')) : {}

function saveProgress() {
  writeFileSync(cachePath, JSON.stringify(cache), 'utf-8')
  writeFileSync(dataPath, JSON.stringify(catalog), 'utf-8')
}

function isStale(entry) {
  if (!entry) return true
  if (entry.spotifyId) return false
  const ageDays = (Date.now() - new Date(entry.checkedAt).getTime()) / 86_400_000
  return ageDays > RETRY_NOT_FOUND_AFTER_DAYS
}

const allStale = catalog.albums.filter((a) => isStale(cache[a.id]))
const pending = allStale.slice(0, LIMIT)
console.log(
  `Discos: ${catalog.albums.length} · resueltos: ${catalog.albums.length - allStale.length} · pendientes: ${allStale.length} · a buscar ahora: ${pending.length}`,
)

if (pending.length === 0) {
  console.log('Nada por buscar en esta corrida.')
  process.exit(0)
}

let accessToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    throw new Error(`No se pudo obtener token de Spotify (HTTP ${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  accessToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
  return accessToken
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

class RateLimitedError extends Error {}

async function searchAlbum(artist, title) {
  const token = await getAccessToken()
  const q = encodeURIComponent(`album:${title} artist:${artist}`)
  const url = `https://api.spotify.com/v1/search?type=album&limit=1&q=${q}`

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '2')
      if (retryAfter > MAX_RETRY_AFTER_S) {
        // Backoff largo: Spotify nos está pidiendo frenar en serio. No vale la
        // pena dormir eso dentro del job; cortamos toda la corrida acá.
        throw new RateLimitedError(
          `Spotify pidió esperar ${retryAfter}s (> ${MAX_RETRY_AFTER_S}s máx). Cortando la corrida.`,
        )
      }
      await sleep((retryAfter + 1) * 1000)
      continue
    }
    if (res.status === 401) {
      accessToken = null // token vencido antes de tiempo: forzar refresh y reintentar
      continue
    }
    if (!res.ok) {
      throw new Error(`Spotify search falló (HTTP ${res.status}) para "${artist} - ${title}"`)
    }
    const data = await res.json()
    return data.albums?.items?.[0]?.id ?? null
  }
  throw new Error(`Demasiados reintentos buscando "${artist} - ${title}"`)
}

let found = 0
let processed = 0
let stoppedEarly = null

for (const album of pending) {
  if (Date.now() - startedAt > MAX_RUNTIME_MS) {
    stoppedEarly = `Presupuesto de tiempo (${MAX_RUNTIME_MS / 1000}s) agotado`
    break
  }

  try {
    const spotifyId = await searchAlbum(album.artist, album.title)
    cache[album.id] = { spotifyId, checkedAt: new Date().toISOString() }
    album.spotifyId = spotifyId
    if (spotifyId) found++
  } catch (err) {
    if (err instanceof RateLimitedError) {
      console.error(err.message)
      stoppedEarly = err.message
      break
    }
    console.error(err.message)
    // No cachear el fallo: se reintenta en la próxima corrida.
  }

  processed++
  if (processed % 50 === 0) {
    saveProgress()
    console.log(`  ${processed}/${pending.length} procesados (${found} con match)`)
  }

  // ~4 req/s: margen conservador bajo el límite de Spotify para Client Credentials.
  await sleep(250)
}

saveProgress()
if (stoppedEarly) {
  console.log(`Corrida cortada antes de tiempo: ${stoppedEarly}`)
}
console.log(`Listo: ${processed} procesados, ${found} con match de Spotify.`)
