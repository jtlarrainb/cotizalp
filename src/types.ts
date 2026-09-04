export interface Listing {
  store: string
  price: number | null
  url: string | null
  image: string | null
}

export interface Album {
  id: string
  artist: string
  title: string
  minPrice: number | null
  image: string | null
  storeCount: number
  listings: Listing[]
  /** ID de álbum de Spotify, resuelto en `scripts/fetch-spotify.mjs`. `null` si no se encontró match. */
  spotifyId: string | null
}

export interface Catalog {
  updatedAt: string | null
  albumCount: number
  albums: Album[]
}
