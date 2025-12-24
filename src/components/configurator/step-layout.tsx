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
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-1.5 h-8 bg-gradient-to-b from-[#48A9A6] to-[#01384B] rounded-full" />
          <h2 className="text-2xl md:text-3xl font-bold text-[#01384B]">
            {title}
          </h2>
        </motion.div>
        {description && (
          <motion.p
            className="text-slate-500 ml-[18px] pl-3 border-l-2 border-slate-100"
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
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-[#48A9A6]/50 focus:ring-offset-2',
        selected
          ? 'border-[#48A9A6] bg-gradient-to-br from-[#48A9A6]/5 to-[#01384B]/5 shadow-lg shadow-[#48A9A6]/10'
          : 'border-slate-200 bg-white hover:border-[#48A9A6]/50 hover:shadow-md hover:shadow-slate-100',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300',
          selected
            ? 'border-[#48A9A6] bg-gradient-to-br from-[#48A9A6] to-[#3d9996] shadow-md shadow-[#48A9A6]/30'
            : 'border-slate-300 bg-white'
        )}
      >
        {selected && (
          <motion.svg
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-3.5 h-3.5 text-white"
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
    default: 'bg-slate-100 text-slate-600',
    premium: 'bg-gradient-to-r from-[#FF8621] to-[#ED6663] text-white shadow-sm shadow-[#FF8621]/20',
    recommended: 'bg-gradient-to-r from-[#48A9A6] to-[#3d9996] text-white shadow-sm shadow-[#48A9A6]/20'
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
      variants[variant]
    )}>
      {children}
    </span>
  )
}
