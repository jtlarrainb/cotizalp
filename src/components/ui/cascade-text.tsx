import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TextRevealProps {
  text: string
  className?: string
  /** Cada cuántos ms se dispara el efecto automáticamente. */
  intervalMs?: number
  /** Cuánto dura la letra "revelada" (naranja) antes de volver a su color normal. */
  holdMs?: number
}

export function TextReveal({ text, className, intervalMs = 45_000, holdMs = 2000 }: TextRevealProps) {
  const [active, setActive] = useState(false)
  const letters = Array.from(text)

  useEffect(() => {
    let holdTimeout: ReturnType<typeof setTimeout> | undefined

    const interval = setInterval(() => {
      setActive(true)
      holdTimeout = setTimeout(() => setActive(false), holdMs)
    }, intervalMs)

    return () => {
      clearInterval(interval)
      if (holdTimeout) clearTimeout(holdTimeout)
    }
  }, [intervalMs, holdMs])

  return (
    <span className={cn('inline-flex select-none', className)}>
      {letters.map((letter, i) => (
        <span key={i} className="relative inline-block overflow-hidden">
          {/* Letra original: cae hacia abajo y sale de vista */}
          <span
            className="inline-block transition-transform duration-300 ease-out"
            style={{
              transform: active ? 'translateY(100%)' : 'translateY(0%)',
              transitionDelay: `${i * 30}ms`,
            }}
          >
            {letter === ' ' ? ' ' : letter}
          </span>
          {/* Duplicado naranja: cae en cascada desde arriba para reemplazarla */}
          <span
            aria-hidden="true"
            className="absolute inset-0 inline-block text-orange-500 transition-transform duration-300 ease-out"
            style={{
              transform: active ? 'translateY(0%)' : 'translateY(-100%)',
              transitionDelay: `${i * 30}ms`,
            }}
          >
            {letter === ' ' ? ' ' : letter}
          </span>
        </span>
      ))}
    </span>
  )
}
