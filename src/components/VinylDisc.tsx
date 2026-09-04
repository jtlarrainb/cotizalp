import { cn } from '@/lib/utils'

interface VinylDiscProps {
  image?: string | null
  spinning?: boolean
  className?: string
}

export function VinylDisc({ image, spinning = false, className }: VinylDiscProps) {
  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden rounded-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black shadow-xl',
        className,
      )}
      style={spinning ? { animation: 'vinyl-spin 2.4s linear infinite' } : undefined}
    >
      {/* Reflejo leve de los colores de la carátula sobre el vinilo negro */}
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 mix-blend-screen blur-xl"
        />
      )}

      <div className="absolute inset-[6%] rounded-full border border-white/5" />
      <div className="absolute inset-[13%] rounded-full border border-white/5" />
      <div className="absolute inset-[20%] rounded-full border border-white/5" />
      <div className="absolute inset-[27%] rounded-full border border-white/5" />
      <div className="absolute inset-[34%] rounded-full border border-white/5" />

      <div className="absolute inset-[38%] overflow-hidden rounded-full bg-neutral-700 ring-2 ring-black/40">
        {image && <img src={image} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="absolute top-1/2 left-1/2 h-[6%] w-[6%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-1 ring-white/30" />
    </div>
  )
}
