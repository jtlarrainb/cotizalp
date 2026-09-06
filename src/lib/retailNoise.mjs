// Limpieza de anotaciones que las tiendas agregan al nombre del disco (preventa,
// color/formato de vinilo, cantidad de LPs, edición de aniversario, etc.), que no
// son parte del título/artista real. La usan tanto la búsqueda de Spotify
// (src/lib/spotify.ts) como el agrupador de catálogo (scripts/build-data.mjs),
// para no tratar como discos distintos dos listados del mismo álbum que solo
// difieren en el color de vinilo o el formato.

/**
 * Separa un texto "sucio" de tienda (artista o título) en su parte limpia y la
 * anotación removida. Ej: "MTV UNPLUGGED (30TH ANNIVERSARY) (BLACK VINYL) (2LP)"
 * -> { clean: "MTV UNPLUGGED", variant: "(30TH ANNIVERSARY) (BLACK VINYL) (2LP)", preventa: false }
 */
export function splitRetailNoise(rawText) {
  const preventa = /\(\s*preventa\s*\)/i.test(rawText)
  const working = rawText.replace(/\(\s*preventa\s*\)/gi, ' ')

  let cutIndex = working.length
  const markerIndex = working.search(/[([]/)
  if (markerIndex > 0) cutIndex = markerIndex

  const beforeMarker = working.slice(0, cutIndex)
  const lpSuffixMatch = beforeMarker.match(/\s*\d{0,2}\s?lp\.?$/i)
  if (lpSuffixMatch) cutIndex = lpSuffixMatch.index

  let clean = working.slice(0, cutIndex).replace(/\s+/g, ' ').trim()
  let variant = working.slice(cutIndex).replace(/\s+/g, ' ').trim()

  if (!clean) {
    clean = rawText.trim()
    variant = ''
  }

  return { clean, variant, preventa }
}

/** Solo la parte limpia de {@link splitRetailNoise}. */
export function stripRetailNoise(text) {
  return splitRetailNoise(text).clean
}
