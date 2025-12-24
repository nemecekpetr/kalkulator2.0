'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StepLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function StepLayout({ title, description, children, className }: StepLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-6', className)}
    >
      {/* Header */}
      <div className="space-y-2">
        <motion.h2
          className="text-2xl md:text-3xl font-display font-bold text-[#01384B]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h2>
        {description && (
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {description}
          </motion.p>
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// Reusable option card component
interface OptionCardProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function OptionCard({ selected, onClick, children, className, disabled }: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'relative w-full p-4 rounded-xl border-2 text-left transition-all',
        'focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/50 focus:ring-offset-2',
        selected
          ? 'border-[#48A9A6] bg-[#48A9A6]/5 shadow-lg shadow-[#48A9A6]/10'
          : 'border-border bg-card hover:border-[#48A9A6]/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          selected
            ? 'border-[#48A9A6] bg-[#48A9A6]'
            : 'border-muted-foreground/30'
        )}
      >
        {selected && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </div>
      {children}
    </motion.button>
  )
}

// Tag/badge for options
interface OptionTagProps {
  children: React.ReactNode
  variant?: 'default' | 'premium' | 'recommended'
}

export function OptionTag({ children, variant = 'default' }: OptionTagProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    premium: 'bg-gradient-to-r from-[#FF8621] to-[#ED6663] text-white',
    recommended: 'bg-[#48A9A6] text-white'
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant]
    )}>
      {children}
    </span>
  )
}
