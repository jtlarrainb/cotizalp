import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpNarrowWide, Disc3, Search, Store } from 'lucide-react'
import type { SortOption } from '@/App'
import { FluidDropdown, type FluidDropdownOption } from '@/components/ui/fluid-dropdown'

interface SearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  sortBy: SortOption
  onSortByChange: (value: SortOption) => void
  resultCount: number
}

const sortOptions: FluidDropdownOption<SortOption>[] = [
  { id: 'artist', label: 'Artista (A-Z)', icon: ArrowDownAZ },
  { id: 'title', label: 'Nombre (A-Z)', icon: Disc3 },
  { id: 'price-asc', label: 'Precio: menor a mayor', icon: ArrowUpNarrowWide },
  { id: 'price-desc', label: 'Precio: mayor a menor', icon: ArrowDownWideNarrow },
  { id: 'stores', label: 'Más tiendas', icon: Store },
]

export function SearchBar({ query, onQueryChange, sortBy, onSortByChange, resultCount }: SearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por artista o disco..."
          className="w-full rounded-full border border-white/10 bg-white/5 py-2 pr-4 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-orange-500/50 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500">{resultCount.toLocaleString('es-CL')} discos</span>
        <FluidDropdown options={sortOptions} value={sortBy} onChange={onSortByChange} />
      </div>
    </div>
  )
}
