'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STEPS } from '@/lib/constants/configurator'

export function ConfiguratorProgress() {
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const canProceed = useConfiguratorStore((state) => state.canProceed)
  const shouldSkipStep = useConfiguratorStore((state) => state.shouldSkipStep)
  const setStep = useConfiguratorStore((state) => state.setStep)

  // Filter out skipped steps
  const visibleSteps = STEPS.filter(step => !shouldSkipStep(step.number))
  const totalSteps = visibleSteps.length
  const currentIndex = visibleSteps.findIndex(step => step.number === currentStep)
  // Progress bar should reach exactly to the current step point
  // For step 1 (index 0) of 10 steps, progress should be at 0%
  // For step 5 (index 4) of 10 steps, progress should be at position of dot 5
  // The dots are evenly spaced, so we need to calculate based on position
  const progress = totalSteps > 1 ? (currentIndex / (totalSteps - 1)) * 100 : 100

  // Check if a step is completed (can proceed from it)
  const isStepCompleted = (stepNumber: number) => {
    return canProceed(stepNumber)
  }

  // Check if a step is clickable - must be completed or be the current step
  const isStepClickable = (stepNumber: number, stepIndex: number) => {
    // Current step is always clickable
    if (stepNumber === currentStep) return true
    // Past steps that are completed are clickable
    if (stepIndex < currentIndex) return true
    // Future steps are only clickable if all previous steps are completed
    if (stepIndex > currentIndex) {
      // Check if all steps up to this one are completed
      for (let i = 0; i <= stepIndex; i++) {
        const step = visibleSteps[i]
        if (!canProceed(step.number)) {
          return false
        }
      }
      return true
    }
    return false
  }

  const handleStepClick = (stepNumber: number) => {
    const stepIndex = visibleSteps.findIndex(s => s.number === stepNumber)
    if (isStepClickable(stepNumber, stepIndex)) {
      setStep(stepNumber)
    }
  }

  return (
    <div className="bg-white border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        {/* Progress bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#48A9A6] to-[#01384B] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>

        {/* Step indicators - Desktop */}
        <div className="hidden md:flex items-center justify-between">
          {visibleSteps.map((step, index) => {
            const isCompleted = isStepCompleted(step.number)
            const isCurrent = step.number === currentStep
            const isPast = index < currentIndex
            const clickable = isStepClickable(step.number, index)

            return (
              <button
                key={step.number}
                onClick={() => handleStepClick(step.number)}
                disabled={!clickable}
                className={cn(
                  'flex flex-col items-center gap-1 transition-all',
                  clickable && 'cursor-pointer hover:opacity-80',
                  !clickable && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    isCurrent && 'bg-[#01384B] text-white ring-4 ring-[#48A9A6]/30',
                    isPast && isCompleted && 'bg-[#48A9A6] text-white',
                    !isCurrent && !isPast && isCompleted && 'bg-[#48A9A6]/70 text-white',
                    !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isCurrent && 'text-[#01384B]',
                    isPast && isCompleted && 'text-[#48A9A6]',
                    !isCurrent && !isPast && isCompleted && 'text-[#48A9A6]',
                    !isCompleted && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Step indicator - Mobile */}
        <div className="md:hidden flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#01384B]">
              Krok {currentIndex + 1} z {totalSteps}
            </p>
            <p className="text-xs text-muted-foreground">
              {visibleSteps[currentIndex]?.title}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {visibleSteps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex && 'w-4 bg-[#01384B]',
                  index < currentIndex && 'bg-[#48A9A6]',
                  index > currentIndex && 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
