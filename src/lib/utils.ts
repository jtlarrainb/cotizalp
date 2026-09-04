import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const priceFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export function formatPrice(price: number | null): string {
  if (price == null) return 'Consultar precio'
  return priceFormatter.format(price)
}

const SYMBOLS_GROUP = '#'
const COMBINING_MARK_MIN = 0x0300
const COMBINING_MARK_MAX = 0x036f

function stripDiacritics(value: string): string {
  return Array.from(value.normalize('NFD'))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0
      return code < COMBINING_MARK_MIN || code > COMBINING_MARK_MAX
    })
    .join('')
}

/** Letra para agrupar en el listado alfabético: '#' para símbolos/números, si no la letra (sin tilde). */
export function groupKeyFor(value: string): string {
  const first = stripDiacritics(value.trim()).charAt(0).toUpperCase()
  return first >= 'A' && first <= 'Z' ? first : SYMBOLS_GROUP
}

const PRICE_BUCKET_SIZE = 10_000

/** Tramo de $10.000 para agrupar en el listado por precio (p. ej. "$10.000 - $20.000"). */
export function priceBucketLabel(price: number | null): string {
  if (price == null) return 'Consultar precio'
  const low = Math.floor(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE
  const high = low + PRICE_BUCKET_SIZE
  return `${priceFormatter.format(low)} - ${priceFormatter.format(high)}`
}
