'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StatusColor, StatusStep } from './status-config'

// Re-export server-safe types, constants, and utilities
export type { StatusColor, StatusStep }
export { getStatusStep, CONFIGURATION_STATUSES, QUOTE_STATUSES, ORDER_STATUSES, PRODUCTION_STATUSES } from './status-config'

// Color mappings for chip backgrounds and borders
const chipColors: Record<StatusColor, string> = {
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
}

const dotBgColors: Record<StatusColor, string> = {
  gray: 'bg-gray-400',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
}

// --- StatusChip ---

interface StatusChipProps {
  status: StatusStep
  showExpiredWarning?: boolean
}

export function StatusChip({ status, showExpiredWarning }: StatusChipProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold', chipColors[status.color])}>
        <div className={cn('w-2 h-2 rounded-full', dotBgColors[status.color])} />
        {status.label}
      </div>
      {showExpiredWarning && (
        <div className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">Vypršela platnost</span>
        </div>
      )}
    </div>
  )
}

// --- StatusSteps (timeline + action buttons) ---

interface StatusStepsProps {
  statuses: StatusStep[]
  branchValues?: string[]
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
  showExpiredWarning?: boolean
}

export function StatusSteps({
  statuses,
  branchValues = [],
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusStepsProps) {
  const mainStatuses = statuses.filter(s => !branchValues.includes(s.value))
  const branchStatuses = statuses.filter(s => branchValues.includes(s.value))

  // Find the current status index in main flow
  const currentMainIndex = mainStatuses.findIndex(s => s.value === currentStatus)
  const isBranchActive = branchValues.includes(currentStatus)

  // For branch active: find which main step was the branch point
  // (the last completed main step before branching)
  const branchPointIndex = isBranchActive
    ? Math.max(0, mainStatuses.findIndex(s => {
        const statusIndex = statuses.findIndex(st => st.value === s.value)
        const currentStatusIndex = statuses.findIndex(st => st.value === currentStatus)
        return statusIndex >= currentStatusIndex
      }) - 1)
    : -1

  const getEffectiveIndex = () => {
    if (isBranchActive) return branchPointIndex
    return currentMainIndex
  }
  const effectiveIndex = getEffectiveIndex()

  const handleDotClick = (status: StatusStep) => {
    if (disabled || !onStatusChange || status.value === currentStatus) return
    onStatusChange(status.value)
  }

  // Determine next forward action (first main status after current)
  const nextMainStatus = !isBranchActive && currentMainIndex >= 0 && currentMainIndex < mainStatuses.length - 1
    ? mainStatuses[currentMainIndex + 1]
    : null

  const isInteractive = !disabled && !!onStatusChange

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="flex items-start min-w-0">
          {mainStatuses.map((status, index) => {
            const isCompleted = index < effectiveIndex
            const isCurrent = index === effectiveIndex
            const isFuture = index > effectiveIndex
            const isBranchPoint = isBranchActive && index === branchPointIndex

            // Dot color
            let dotClass = 'bg-[#e2e8f0] text-muted-foreground' // future
            if (isCompleted) dotClass = 'bg-[#48A9A6] text-white'
            if (isCurrent && !isBranchActive) dotClass = cn(dotBgColors[status.color], 'text-white')
            if (isBranchPoint) dotClass = 'bg-red-500 text-white'

            // Line color
            const lineCompleted = index < effectiveIndex
            const lineClass = lineCompleted ? 'bg-[#48A9A6]' : 'bg-[#e2e8f0]'

            // Label color
            let labelClass = 'text-muted-foreground/50' // future
            if (isCompleted) labelClass = 'text-[#48A9A6]'
            if (isCurrent) labelClass = 'text-foreground font-semibold'
            if (isBranchPoint) labelClass = 'text-red-500 font-semibold'

            const isClickable = isInteractive && status.value !== currentStatus

            return (
              <div key={status.value} className="flex items-start flex-1 min-w-0" style={{ maxWidth: index === mainStatuses.length - 1 ? 'fit-content' : undefined }}>
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <button
                    type="button"
                    onClick={() => handleDotClick(status)}
                    disabled={!isClickable}
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors',
                      dotClass,
                      isClickable && 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-[#48A9A6]/30',
                      !isClickable && 'cursor-default'
                    )}
                  >
                    {isCompleted || isCurrent ? <Check className="w-3 h-3" /> : index + 1}
                  </button>
                  {/* Label */}
                  <span className={cn('text-[11px] mt-1.5 whitespace-nowrap', labelClass)}>
                    {status.label}
                  </span>
                </div>
                {/* Connecting line */}
                {index < mainStatuses.length - 1 && (
                  <div className={cn('h-[2px] flex-1 mt-2.5 mx-1', lineClass)} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      {isInteractive && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Next forward action */}
          {nextMainStatus && (
            <Button
              type="button"
              size="sm"
              onClick={() => onStatusChange(nextMainStatus.value)}
              disabled={disabled}
              className="bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90 text-white font-semibold"
            >
              {disabled && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {nextMainStatus.label}
            </Button>
          )}
          {/* Branch actions (e.g., Odmítnout, Zrušit) */}
          {!isBranchActive && branchStatuses.map(branch => (
            <Button
              key={branch.value}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(branch.value)}
              disabled={disabled}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              {branch.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

