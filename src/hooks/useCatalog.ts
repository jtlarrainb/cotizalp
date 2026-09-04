import type { Catalog } from '@/types'
import catalogData from '@/data/discos.json'

// El catálogo se compila directo dentro del bundle (ver scripts/build-data.mjs)
// para que la app funcione como un único archivo .html abierto con doble clic,
// sin depender de un fetch() a un servidor.
const catalog = catalogData as Catalog

export function useCatalog() {
  return { catalog, error: null as string | null, loading: false }
}
