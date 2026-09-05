// Convierte el CSV generado por el scraper CotizaLP(Cloud) en un JSON agrupado por
// disco (Artista + Título), listo para que la webapp lo sirva como asset estático.
//
// Uso:
//   node scripts/build-data.mjs [ruta-o-url-al-csv]
//
// Por defecto, descarga el CSV publicado del Google Sheet "vinilos" (fuente de
// verdad: la actualiza el scraper en la nube), en vez de un archivo local que
// puede quedar desactualizado. Se puede pasar una ruta local o una URL propia
// como argumento para sobreescribir el origen.

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPREADSHEET_ID = '1S4DJqsvi9qVB5pgiliHAGwXDXCj1qPZ6940WKaYuVt4'
const SHEET_GID = '46693344'
const DEFAULT_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`

const source = process.argv[2] ?? DEFAULT_CSV_URL
const outPath = resolve(__dirname, '../src/data/discos.json')

let raw
if (/^https?:\/\//i.test(source)) {
  console.log(`Descargando datos desde: ${source}`)
  const response = await fetch(source)
  if (!response.ok) {
    console.error(`No se pudo descargar el CSV (HTTP ${response.status}): ${source}`)
    process.exit(1)
  }
  raw = await response.text()
} else {
  const csvPath = resolve(source)
  if (!existsSync(csvPath)) {
    console.error(`No se encontró el CSV en: ${csvPath}`)
    process.exit(1)
  }
  raw = readFileSync(csvPath, 'utf-8')
}

const lines = raw.split(/\r?\n/)

// La primera línea del CSV es un metadato ("Fecha de actualizacion: ..."),
// no parte de la tabla. La guardamos y se la quitamos al parser.
const updatedAtLine = lines[0] ?? ''
const updatedAtMatch = updatedAtLine.match(/Fecha de actualizacion:\s*([^,]+)/i)
const updatedAt = updatedAtMatch ? updatedAtMatch[1].trim() : null

const csvBody = lines.slice(1).join('\n')

let skipped = 0
const records = parse(csvBody, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_column_count: true,
  relax_quotes: true,
  on_record: (record) => {
    if (!record.Artista || !record.Disco) {
      skipped++
      return null
    }
    return record
  },
})

const PLACEHOLDER_ARTIST = new Set([
  'ARTISTA NO DISPONIBLE',
  'ARTISTA NO DISPONIBLE'.toUpperCase(),
])
const PLACEHOLDER_TITLE = new Set(['TÍTULO NO DISPONIBLE', 'TITULO NO DISPONIBLE'])
const PLACEHOLDER_IMAGE = new Set(['', 'IMAGEN NO DISPONIBLE'])
const PLACEHOLDER_LINK = new Set(['', 'ENLACE NO DISPONIBLE'])

function normalizeKey(value) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** @type {Map<string, { artist: string, title: string, listings: any[] }>} */
const groups = new Map()

for (const record of records) {
  const artistRaw = (record.Artista ?? '').trim()
  const titleRaw = (record.Disco ?? '').trim()

  if (!artistRaw || !titleRaw) {
    skipped++
    continue
  }
  if (PLACEHOLDER_ARTIST.has(artistRaw.toUpperCase())) {
    skipped++
    continue
  }
  if (PLACEHOLDER_TITLE.has(titleRaw.toUpperCase())) {
    skipped++
    continue
  }

  const store = (record.Tienda ?? '').trim() || 'Tienda desconocida'
  const priceDigits = (record.Precio ?? '').replace(/[^\d]/g, '')
  const price = priceDigits ? Number(priceDigits) : null

  const linkRaw = (record.Enlace ?? '').trim()
  const url = PLACEHOLDER_LINK.has(linkRaw.toUpperCase()) ? null : linkRaw

  const imageRaw = (record.Imagen ?? '').trim()
  const image = PLACEHOLDER_IMAGE.has(imageRaw.toUpperCase()) ? null : imageRaw

  const key = `${normalizeKey(artistRaw)}|||${normalizeKey(titleRaw)}`

  let group = groups.get(key)
  if (!group) {
    group = { artist: artistRaw, title: titleRaw, listings: [] }
    groups.set(key, group)
  }

  group.listings.push({ store, price, url, image })
}

const albums = []
for (const [key, group] of groups) {
  // Ordenar listados por precio ascendente (sin precio al final)
  group.listings.sort((a, b) => {
    if (a.price == null && b.price == null) return 0
    if (a.price == null) return 1
    if (b.price == null) return -1
    return a.price - b.price
  })

  const cheapestWithImage = group.listings.find((l) => l.image) ?? null
  const cheapestWithPrice = group.listings.find((l) => l.price != null) ?? null

  albums.push({
    id: key,
    artist: group.artist,
    title: group.title,
    minPrice: cheapestWithPrice ? cheapestWithPrice.price : null,
    image: cheapestWithImage ? cheapestWithImage.image : null,
    storeCount: new Set(group.listings.map((l) => l.store)).size,
    listings: group.listings,
  })
}

albums.sort((a, b) => {
  const artistCmp = a.artist.localeCompare(b.artist, 'es')
  if (artistCmp !== 0) return artistCmp
  return a.title.localeCompare(b.title, 'es')
})

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  JSON.stringify({ updatedAt, albumCount: albums.length, albums }),
  'utf-8',
)

console.log(`Origen: ${source}`)
console.log(`Filas leídas: ${records.length} (omitidas: ${skipped})`)
console.log(`Discos únicos: ${albums.length}`)
console.log(`Actualizado: ${updatedAt ?? 'desconocido'}`)
console.log(`JSON escrito en: ${outPath}`)
