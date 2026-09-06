import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Album } from '@/types'
import { useCatalog } from '@/hooks/useCatalog'
import { FeaturedAlbum } from '@/components/FeaturedAlbum'
import { VinylCard } from '@/components/VinylCard'
import { SearchBar } from '@/components/SearchBar'
import { TextReveal } from '@/components/ui/cascade-text'
import { cn, groupKeyFor, priceBucketLabel } from '@/lib/utils'

export type SortOption = 'artist' | 'title' | 'price-asc' | 'price-desc' | 'stores'

const PAGE_SIZE = 60

/** Etiqueta de separador de sección para la grilla, según el orden activo. `null` = sin separadores. */
function groupLabelFor(album: Album, sortBy: SortOption): string | null {
  switch (sortBy) {
    case 'artist':
      return groupKeyFor(album.artist)
    case 'title':
      return groupKeyFor(album.title)
    case 'price-asc':
    case 'price-desc':
      return priceBucketLabel(album.minPrice)
    default:
      return null
  }
}

function pickDefaultFeatured(albums: Album[]): Album | null {
  if (albums.length === 0) return null
  let best = albums[0]
  for (const album of albums) {
    if (album.image && album.storeCount > best.storeCount) best = album
  }
  return best
}

function App() {
  const { catalog, error, loading } = useCatalog()

  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('artist')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<Album | null>(null)
  const [heroHovered, setHeroHovered] = useState(false)

  // Debounce de búsqueda para no filtrar ~19k discos en cada pulsación
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim().toLowerCase()), 200)
    return () => clearTimeout(t)
  }, [rawQuery])

  useEffect(() => {
    if (catalog && !selected) setSelected(pickDefaultFeatured(catalog.albums))
  }, [catalog, selected])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, sortBy])

  const filteredAndSorted = useMemo(() => {
    if (!catalog) return []
    let list = catalog.albums
    if (query) {
      list = list.filter(
        (a) => a.artist.toLowerCase().includes(query) || a.title.toLowerCase().includes(query),
      )
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity))
        break
      case 'price-desc':
        sorted.sort((a, b) => (b.minPrice ?? -Infinity) - (a.minPrice ?? -Infinity))
        break
      case 'stores':
        sorted.sort((a, b) => b.storeCount - a.storeCount)
        break
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'es'))
        break
      default:
        sorted.sort((a, b) => a.artist.localeCompare(b.artist, 'es'))
    }
    return sorted
  }, [catalog, query, sortBy])

  const visibleAlbums = filteredAndSorted.slice(0, visibleCount)

  return (
    <div className="min-h-screen text-neutral-100">
      <header
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
        className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur"
      >
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h1>
              <TextReveal
                text="CotizaLP"
                intervalMs={20_000}
                className="text-lg font-bold tracking-tight"
              />
            </h1>
            {catalog?.updatedAt && (
              <span className="text-xs text-neutral-500">
                Actualizado: {catalog.updatedAt} ·{' '}
                <a
                  href="https://github.com/jtlarrainb"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white hover:underline"
                >
                  @jtlarrainb
                </a>
              </span>
            )}
          </div>
          <FeaturedAlbum album={selected} hovered={heroHovered} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {loading && <p className="py-12 text-center text-neutral-500">Cargando catálogo...</p>}

        {error && (
          <p className="py-12 text-center text-red-400">
            No se pudo cargar el catálogo: {error}
          </p>
        )}

        {catalog && (
          <>
            <SearchBar
              query={rawQuery}
              onQueryChange={setRawQuery}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              resultCount={filteredAndSorted.length}
            />

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
              {visibleAlbums.map((album, index) => {
                const groupKey = groupLabelFor(album, sortBy)
                const prevGroupKey = index > 0 ? groupLabelFor(visibleAlbums[index - 1], sortBy) : null
                const showSeparator = groupKey !== null && groupKey !== prevGroupKey

                return (
                  <Fragment key={album.id}>
                    {showSeparator && (
                      <div
                        className={cn(
                          'col-span-full flex items-center gap-3 pb-1',
                          index === 0 ? 'mt-0' : 'mt-3',
                        )}
                      >
                        <span className="text-sm font-bold text-orange-500">{groupKey}</span>
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                    )}
                    <VinylCard
                      album={album}
                      selected={selected?.id === album.id}
                      onSelect={setSelected}
                    />
                  </Fragment>
                )
              })}
            </div>

            {visibleAlbums.length === 0 && (
              <p className="py-12 text-center text-neutral-500">No se encontraron discos.</p>
            )}

            {visibleCount < filteredAndSorted.length && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Cargar más
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
