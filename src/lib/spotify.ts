// Búsqueda del álbum en Spotify hecha directo desde el navegador (Client
// Credentials), pensada para un sitio de audiencia chica y privada (no un
// producto público): el client_secret queda embebido en el bundle estático,
// que es el único modo de llamar a la Spotify Web API sin backend propio.
// Si el sitio alguna vez se comparte más ampliamente, esto debería moverse a
// un proxy (Cloudflare Worker u otro) para no exponer el secreto.

import { stripRetailNoise } from './retailNoise.mjs'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string | undefined

const CACHE_KEY = 'cotizalp:spotify-album-cache:v1'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 días

interface CacheEntry {
  spotifyId: string | null
  cachedAt: number
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage lleno o no disponible (modo privado): no es crítico, se
    // vuelve a buscar la próxima vez.
  }
}

function cacheKeyFor(artist: string, title: string) {
  return `${artist.trim().toUpperCase()}|||${title.trim().toUpperCase()}`
}

let tokenPromise: Promise<string> | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  if (Date.now() < tokenExpiresAt && tokenPromise) return tokenPromise

  tokenPromise = (async () => {
    const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    if (!res.ok) throw new Error(`Spotify auth falló (HTTP ${res.status})`)
    const data = await res.json()
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
    return data.access_token as string
  })()

  return tokenPromise
}

/** Busca el álbum en Spotify; devuelve su ID o `null` si no hay match. Cachea en localStorage. */
export async function searchSpotifyAlbum(artist: string, title: string): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null

  const cleanArtist = stripRetailNoise(artist)
  const cleanTitle = stripRetailNoise(title)

  const key = cacheKeyFor(cleanArtist, cleanTitle)
  const cache = readCache()
  const cached = cache[key]
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.spotifyId
  }

  try {
    const token = await getAccessToken()
    const q = encodeURIComponent(`album:${cleanTitle} artist:${cleanArtist}`)
    const res = await fetch(`https://api.spotify.com/v1/search?type=album&limit=1&q=${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Spotify search falló (HTTP ${res.status})`)
    const data = await res.json()
    const spotifyId: string | null = data.albums?.items?.[0]?.id ?? null

    cache[key] = { spotifyId, cachedAt: Date.now() }
    writeCache(cache)
    return spotifyId
  } catch (err) {
    console.error('searchSpotifyAlbum:', err)
    return null
  }
}
