export interface Listing {
  store: string
  price: number | null
  url: string | null
  image: string | null
  /** Anotación de formato/color/edición que traía este listado (p. ej. "(2LP) (BLACK VINYL)"). */
  variant: string | null
  /** Si esta tienda lo tiene marcado como preventa. */
  preventa: boolean
}

export interface Album {
  id: string
  artist: string
  title: string
  minPrice: number | null
  image: string | null
  storeCount: number
  listings: Listing[]
}

export interface Catalog {
  updatedAt: string | null
  albumCount: number
  albums: Album[]
}
