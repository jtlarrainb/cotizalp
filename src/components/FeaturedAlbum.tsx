import { useEffect, useState } from 'react'
import type { Album } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { loadSpotifyIframeApi, searchSpotifyAlbum, type SpotifyEmbedController } from '@/lib/spotify'
import { stripRetailNoise } from '@/lib/retailNoise.mjs'
import { VinylDisc } from './VinylDisc'

interface FeaturedAlbumProps {
  album: Album | null
  hovered: boolean
  /** 'sidebar' apila portada y datos en una sola columna angosta; 'bar' los pone lado a lado. */
  layout?: 'bar' | 'sidebar'
}

export function FeaturedAlbum({ album, hovered, layout = 'bar' }: FeaturedAlbumProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [spotifyId, setSpotifyId] = useState<string | null>(null)
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [embedNode, setEmbedNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    setImageFailed(false)
  }, [album?.id])

  useEffect(() => {
    setSpotifyId(null)
    if (!album) return

    let cancelled = false
    setSpotifyLoading(true)
    searchSpotifyAlbum(album.artist, album.title).then((id) => {
      if (cancelled) return
      setSpotifyId(id)
      setSpotifyLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [album?.id])

  // Crea el reproductor embebido vía la IFrame API (en vez de un <iframe src>
  // plano) para poder escuchar su estado de reproducción y hacer girar el
  // vinilo del header mientras suena la música.
  useEffect(() => {
    setIsPlaying(false)
    if (!spotifyId || !embedNode) return

    let cancelled = false
    let controller: SpotifyEmbedController | null = null

    loadSpotifyIframeApi().then((IFrameAPI) => {
      if (cancelled) return
      IFrameAPI.createController(
        embedNode,
        { uri: `spotify:album:${spotifyId}`, width: '100%', height: 80 },
        (embedController) => {
          if (cancelled) {
            embedController.destroy?.()
            return
          }
          controller = embedController
          controller.addListener('playback_update', (e) => {
            setIsPlaying(!e.data.isPaused)
          })
        },
      )
    })

    return () => {
      cancelled = true
      controller?.removeListener('playback_update')
      controller?.destroy?.()
    }
  }, [spotifyId, embedNode])

  if (!album) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
        Elige un disco del catálogo para verlo aquí
      </div>
    )
  }

  const cheapest = album.listings[0]
  const spotifyQuery = encodeURIComponent(
    `${stripRetailNoise(album.artist)} ${stripRetailNoise(album.title)}`,
  )

  return (
    <div
      className={cn(
        'grid gap-6',
        layout === 'sidebar' ? 'grid-cols-1' : 'sm:grid-cols-[auto_1fr] sm:items-center',
      )}
    >
      <div className="relative mx-auto h-40 w-56 sm:h-48 sm:w-64">
        {/* Disco de vinilo: detrás de la portada en reposo, se desliza a la derecha con el hover */}
        <div
          className={cn(
            'absolute top-1/2 right-0 h-40 w-40 -translate-y-1/2 transition-transform duration-500 ease-out sm:h-48 sm:w-48',
            hovered || isPlaying ? 'translate-x-0' : '-translate-x-16',
          )}
        >
          <VinylDisc image={album.image} spinning className="h-full w-full" />
        </div>

        <div
          className={cn(
            'absolute top-1/2 left-0 z-10 h-40 w-40 -translate-y-1/2 overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 transition-transform duration-300 ease-out sm:h-48 sm:w-48',
            hovered && 'scale-105',
          )}
        >
          {album.image && !imageFailed ? (
            <img
              src={album.image}
              alt={album.title}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-800 p-3 text-center text-sm text-neutral-400">
              {album.title}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">En vitrina</p>
        <h2 className="truncate text-2xl font-bold text-white sm:text-3xl">{album.artist}</h2>
        <p className="truncate text-lg text-neutral-300">{album.title}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xl font-semibold text-orange-500">{formatPrice(album.minPrice)}</span>
          <span className="text-sm text-neutral-500">
            desde {cheapest?.store ?? '—'} · {album.storeCount}{' '}
            {album.storeCount === 1 ? 'tienda' : 'tiendas'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cheapest?.url && (
            <a
              href={cheapest.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-orange-400"
            >
              Comprar más barato
            </a>
          )}
          {!spotifyLoading && !spotifyId && (
            <a
              href={`https://open.spotify.com/search/${spotifyQuery}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-[#1DB954] px-4 py-1.5 text-sm font-medium text-[#1DB954] transition-colors hover:bg-[#1DB954]/10"
            >
              <SpotifyLogo className="h-4 w-4" />
              Buscar en Spotify
            </a>
          )}
        </div>

        {spotifyLoading && (
          <p className="mt-4 text-sm text-neutral-500">Buscando en Spotify...</p>
        )}

        {spotifyId && (
          <div className="mt-4 overflow-hidden rounded-xl" style={{ minHeight: 80 }}>
            <div key={spotifyId} ref={setEmbedNode} />
          </div>
        )}

        {album.listings.length > 1 && (
          <details className="mt-4 text-sm text-neutral-400" open={layout === 'sidebar'}>
            <summary className="cursor-pointer text-neutral-300 hover:text-white">
              Ver precios en las {album.storeCount} tiendas
            </summary>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-2">
              {album.listings.map((listing, i) => (
                <li
                  key={`${listing.store}-${i}`}
                  className="flex items-center justify-between gap-3 border-b border-white/5 py-1"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{listing.store}</span>
                    {(listing.variant || listing.preventa) && (
                      <span className="block truncate text-xs text-neutral-500">
                        {listing.preventa && 'Preventa'}
                        {listing.preventa && listing.variant && ' · '}
                        {listing.variant}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span>{formatPrice(listing.price)}</span>
                    {listing.url && (
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-500 hover:underline"
                      >
                        Ir
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}

function SpotifyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0Zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02Zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2Zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3Z" />
    </svg>
  )
}
