import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Album } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { VinylDisc } from './VinylDisc'

interface VinylCardProps {
  album: Album
  selected: boolean
  onSelect: (album: Album) => void
}

export function VinylCard({ album, selected, onSelect }: VinylCardProps) {
  const [hovered, setHovered] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(album.image) && !imageFailed

  return (
    <button
      type="button"
      onClick={() => onSelect(album)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group flex flex-col rounded-xl bg-white/10 p-3 text-left ring-1 ring-white/15 transition-colors',
        selected ? 'bg-white/25 ring-orange-500/50' : 'hover:bg-white/20',
      )}
    >
      <div className="relative aspect-square w-full overflow-visible">
        <motion.div
          className="absolute inset-0 z-0"
          initial={false}
          animate={{ x: hovered ? '16%' : 0, rotate: hovered ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 130, damping: 16 }}
        >
          <VinylDisc image={album.image} className="h-full w-full" />
        </motion.div>

        <motion.div
          className="absolute inset-0 z-10 overflow-hidden rounded-md shadow-lg ring-1 ring-black/40"
          initial={false}
          animate={{ x: hovered ? '-8%' : 0, rotate: hovered ? -3 : 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        >
          {showImage ? (
            <img
              src={album.image!}
              alt={album.title}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-800 p-2 text-center text-xs text-neutral-500">
              {album.title}
            </div>
          )}
        </motion.div>
      </div>

      <div className="mt-3 min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-100">{album.artist}</p>
        <p className="truncate text-xs text-neutral-400">{album.title}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-orange-500">{formatPrice(album.minPrice)}</span>
          <span className="shrink-0 text-[10px] text-neutral-500">
            {album.storeCount} {album.storeCount === 1 ? 'tienda' : 'tiendas'}
          </span>
        </div>
      </div>
    </button>
  )
}
