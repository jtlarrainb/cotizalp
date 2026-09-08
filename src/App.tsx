import { Fragment, useEffect, useMemo, useState } from 'react'
import { PanelLeft, PanelTop } from 'lucide-react'
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

const PANEL_LAYOUT_KEY = 'cotizalp:panel-horizontal'

function readStoredPanelHorizontal(): boolean {
  try {
    return localStorage.getItem(PANEL_LAYOUT_KEY) === '1'
  } catch {
    return false
  }
}

const MIN_STORES_FOR_FEATURED = 5

/** Elige al azar un disco en vitrina entre los que tienen varias tiendas (y portada). */
function pickDefaultFeatured(albums: Album[]): Album | null {
  const candidates = albums.filter((a) => a.image && a.storeCount > MIN_STORES_FOR_FEATURED)
  const pool = candidates.length > 0 ? candidates : albums
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

function App() {
  const { catalog, error, loading } = useCatalog()

  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('artist')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<Album | null>(null)
  const [heroHovered, setHeroHovered] = useState(false)
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null)
  const [panelHorizontal, setPanelHorizontal] = useState(readStoredPanelHorizontal)

  const togglePanelLayout = () => {
    setPanelHorizontal((v) => {
      const next = !v
      try {
        localStorage.setItem(PANEL_LAYOUT_KEY, next ? '1' : '0')
      } catch {
        // localStorage no disponible (modo privado): no es crítico
      }
      return next
    })
  }

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

  // Scroll infinito: cuando el centinela al fondo de la grilla entra en
  // pantalla, se revela la siguiente página en vez de requerir un click.
  useEffect(() => {
    if (!sentinelNode) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE)
        }
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(sentinelNode)
    return () => observer.disconnect()
  }, [sentinelNode])

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
    <div className={cn('min-h-screen text-neutral-100', !panelHorizontal && 'lg:flex')}>
      <header
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
        className={cn(
          'border-white/10 bg-neutral-950/80 backdrop-blur',
          panelHorizontal
            ? 'sticky top-0 z-20 border-b'
            : 'border-b lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 xl:w-96',
        )}
      >
        <div
          className={cn('px-4 py-5 sm:px-6', panelHorizontal && 'mx-auto max-w-6xl')}
        >
          <div className="mb-4 flex items-start justify-between gap-2">
            <h1>
              <TextReveal
                text="CotizaLP"
                intervalMs={20_000}
                className="text-lg font-bold tracking-tight"
              />
            </h1>
            <button
              type="button"
              onClick={togglePanelLayout}
              title={panelHorizontal ? 'Poner panel vertical' : 'Poner panel horizontal'}
              className="shrink-0 rounded-full border border-white/15 p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {panelHorizontal ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelTop className="h-4 w-4" />
              )}
            </button>
          </div>
          {catalog?.updatedAt && (
            <p className="mb-4 -mt-2 text-xs text-neutral-500">
              Actualizado: {catalog.updatedAt} ·{' '}
              <a
                href="https://github.com/jtlarrainb"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover:underline"
              >
                @jtlarrainb
              </a>
            </p>
          )}
          <FeaturedAlbum
            album={selected}
            hovered={heroHovered}
            layout={panelHorizontal ? 'bar' : 'sidebar'}
          />
        </div>
      </header>

      <main
        className={cn(
          'px-4 py-6 sm:px-6',
          panelHorizontal ? 'mx-auto max-w-6xl' : 'mx-auto max-w-6xl lg:mx-0 lg:max-w-none lg:flex-1',
        )}
      >
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
              <div ref={setSentinelNode} className="mt-8 flex justify-center py-4">
                <span className="text-sm text-neutral-500">Cargando más discos...</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
