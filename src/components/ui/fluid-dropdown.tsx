import * as React from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEM_HEIGHT = 40
const ACCENT = '#f97316' // orange-500, acento de la app

function useClickAway<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

export interface FluidDropdownOption<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

interface IconWrapperProps {
  icon: LucideIcon
  isHovered: boolean
}

function IconWrapper({ icon: Icon, isHovered }: IconWrapperProps) {
  return (
    <motion.div
      className="relative mr-2 h-4 w-4"
      initial={false}
      animate={isHovered ? { scale: 1.2 } : { scale: 1 }}
    >
      <Icon className="h-4 w-4" />
      {isHovered && (
        <motion.div
          className="absolute inset-0"
          style={{ color: ACCENT }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </motion.div>
      )}
    </motion.div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.05 },
  },
}

interface FluidDropdownProps<T extends string> {
  options: FluidDropdownOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FluidDropdown<T extends string>({
  options,
  value,
  onChange,
  className,
}: FluidDropdownProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hoveredId, setHoveredId] = React.useState<T | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useClickAway(dropdownRef, () => setIsOpen(false))

  const selected = options.find((o) => o.id === value) ?? options[0]
  const activeId = hoveredId ?? selected.id
  const activeIndex = options.findIndex((o) => o.id === activeId)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('relative inline-block', className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className={cn(
            'inline-flex h-9 items-center justify-between gap-2 rounded-lg border border-white/10 bg-neutral-900 px-3 text-xs font-medium text-neutral-300',
            'transition-colors duration-200 ease-in-out hover:bg-neutral-800 hover:text-neutral-100',
            'focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:outline-none',
            isOpen && 'bg-neutral-800 text-neutral-100',
          )}
        >
          <span className="flex items-center whitespace-nowrap">
            <IconWrapper icon={selected.icon} isHovered={false} />
            {selected.label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.12 }}
            className="flex h-4 w-4 items-center justify-center"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                transition: { type: 'tween', duration: 0.1, ease: 'easeOut' },
              }}
              exit={{
                opacity: 0,
                height: 0,
                transition: { type: 'tween', duration: 0.08, ease: 'easeIn' },
              }}
              className="absolute top-full right-0 z-50 mt-2 w-56"
              onKeyDown={handleKeyDown}
            >
              <div
                className="w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-2xl"
                style={{ transformOrigin: 'top' }}
              >
                <motion.div
                  className="relative py-1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div
                    className="absolute inset-x-1 rounded-md bg-neutral-800"
                    animate={{ y: activeIndex * ITEM_HEIGHT, height: ITEM_HEIGHT }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
                  />
                  {options.map((option) => (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onChange(option.id)
                        setIsOpen(false)
                      }}
                      onHoverStart={() => setHoveredId(option.id)}
                      onHoverEnd={() => setHoveredId(null)}
                      className={cn(
                        'relative flex w-full items-center rounded-md px-3 py-2.5 text-xs transition-colors duration-150',
                        'focus:outline-none',
                        option.id === value || option.id === hoveredId
                          ? 'text-neutral-100'
                          : 'text-neutral-400',
                      )}
                      style={{ height: ITEM_HEIGHT }}
                      whileTap={{ scale: 0.98 }}
                      variants={itemVariants}
                    >
                      <IconWrapper icon={option.icon} isHovered={hoveredId === option.id} />
                      {option.label}
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
