'use client'

import { cn } from '@/lib/utils'
import { ChevronRight, AlertTriangle } from 'lucide-react'

export type StatusColor = 'gray' | 'blue' | 'yellow' | 'green' | 'red'

export interface StatusStep {
  value: string
  label: string
  color: StatusColor
}

interface StatusStepsProps {
  statuses: StatusStep[]
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
  showExpiredWarning?: boolean // For quotes with expired valid_until
}

const colorClasses: Record<StatusColor, { active: string; inactive: string }> = {
  gray: {
    active: 'bg-gray-500 text-white border-gray-500',
    inactive: 'bg-white text-gray-500 border-gray-300 hover:border-gray-400',
  },
  blue: {
    active: 'bg-blue-500 text-white border-blue-500',
    inactive: 'bg-white text-blue-500 border-blue-300 hover:border-blue-400',
  },
  yellow: {
    active: 'bg-yellow-500 text-white border-yellow-500',
    inactive: 'bg-white text-yellow-600 border-yellow-300 hover:border-yellow-400',
  },
  green: {
    active: 'bg-green-500 text-white border-green-500',
    inactive: 'bg-white text-green-500 border-green-300 hover:border-green-400',
  },
  red: {
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'bg-white text-red-500 border-red-300 hover:border-red-400',
  },
}

export function StatusSteps({
  statuses,
  currentStatus,
  onStatusChange,
  disabled = false,
  showExpiredWarning = false,
}: StatusStepsProps) {
  const handleClick = (status: StatusStep) => {
    if (disabled || !onStatusChange || status.value === currentStatus) return
    onStatusChange(status.value)
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {statuses.map((status, index) => {
        const isActive = status.value === currentStatus
        const colors = colorClasses[status.color]
        const isClickable = !disabled && onStatusChange && !isActive

        return (
          <div key={status.value} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" />
            )}
            <button
              type="button"
              onClick={() => handleClick(status)}
              disabled={disabled || isActive}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-full border-2 transition-all duration-200',
                isActive ? colors.active : colors.inactive,
                isClickable && 'cursor-pointer',
                (!isClickable || isActive) && 'cursor-default',
                isActive && 'shadow-sm'
              )}
            >
              {status.label}
            </button>
          </div>
        )
      })}
      {showExpiredWarning && (
        <div className="flex items-center gap-1 ml-2 text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">Vypršela platnost</span>
        </div>
      )}
    </div>
  )
}

// Predefined status configurations for each entity type

export const CONFIGURATION_STATUSES: StatusStep[] = [
  { value: 'new', label: 'Nová', color: 'blue' },
  { value: 'processed', label: 'Zpracovaná', color: 'green' },
]

export const QUOTE_STATUSES: StatusStep[] = [
  { value: 'draft', label: 'Koncept', color: 'gray' },
  { value: 'sent', label: 'Odesláno', color: 'blue' },
  { value: 'accepted', label: 'Akceptováno', color: 'green' },
  { value: 'rejected', label: 'Odmítnuto', color: 'red' },
]

export const ORDER_STATUSES: StatusStep[] = [
  { value: 'created', label: 'Nová', color: 'gray' },
  { value: 'sent', label: 'Odeslaná', color: 'blue' },
  { value: 'in_production', label: 'Předána do výroby', color: 'yellow' },
]

export const PRODUCTION_STATUSES: StatusStep[] = [
  { value: 'pending', label: 'Čeká', color: 'gray' },
  { value: 'in_progress', label: 'Ve výrobě', color: 'yellow' },
  { value: 'completed', label: 'Hotovo', color: 'green' },
  { value: 'cancelled', label: 'Zrušeno', color: 'red' },
]
