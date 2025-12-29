'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STEPS } from '@/lib/constants/configurator'

interface ConfiguratorProgressProps {
  embedded?: boolean
}

export function ConfiguratorProgress({ embedded = false }: ConfiguratorProgressProps) {
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const shouldSkipStep = useConfiguratorStore((state) => state.shouldSkipStep)
  const setStep = useConfiguratorStore((state) => state.setStep)
  const isSubmitted = useConfiguratorStore((state) => state.isSubmitted)

  // Subscribe to all relevant state for canProceed to work correctly
  // This ensures the component re-renders when any step's completion status changes
  const shape = useConfiguratorStore((state) => state.shape)
  const type = useConfiguratorStore((state) => state.type)
  const dimensions = useConfiguratorStore((state) => state.dimensions)
  const color = useConfiguratorStore((state) => state.color)
  const stairs = useConfiguratorStore((state) => state.stairs)
  const technology = useConfiguratorStore((state) => state.technology)
  const lighting = useConfiguratorStore((state) => state.lighting)
  const counterflow = useConfiguratorStore((state) => state.counterflow)
  const waterTreatment = useConfiguratorStore((state) => state.waterTreatment)
  const heating = useConfiguratorStore((state) => state.heating)
  const roofing = useConfiguratorStore((state) => state.roofing)
  const contact = useConfiguratorStore((state) => state.contact)
  const canProceed = useConfiguratorStore((state) => state.canProceed)

  // Mark these as used to avoid lint warnings
  void shape; void type; void dimensions; void color; void stairs;
  void technology; void lighting; void counterflow; void waterTreatment;
  void heating; void roofing; void contact;

  // Filter out skipped steps
  const visibleSteps = STEPS.filter(step => !shouldSkipStep(step.number))
  const totalSteps = visibleSteps.length
  const currentIndex = visibleSteps.findIndex(step => step.number === currentStep)
  const progress = totalSteps > 1 ? (currentIndex / (totalSteps - 1)) * 100 : 100

  // Check if a step is completed
  const isStepCompleted = (stepNumber: number) => {
    return canProceed(stepNumber)
  }

  // Check if a step is clickable
  const isStepClickable = (stepNumber: number, stepIndex: number) => {
    if (stepNumber === currentStep) return true
    if (stepIndex < currentIndex) return true
    if (stepIndex > currentIndex) {
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

  // Po odeslání formuláře skryjeme celý progress bar
  if (isSubmitted) {
    return null
  }

  return (
    <div className={cn(
      "bg-white/95 backdrop-blur-sm border-b border-[#48A9A6]/10 shadow-sm sticky z-40",
      embedded ? "top-0" : "top-0 md:top-[72px]"
    )}>
      <div className="container mx-auto px-4 py-3">
        {/* Desktop layout */}
        <div className="hidden md:block">
          {/* Step title */}
          <div className="mb-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-[#01384B]">
                {visibleSteps[currentIndex]?.title}
              </p>
              <span className="text-xs text-slate-400">
                Krok {currentIndex + 1} z {totalSteps}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#48A9A6] via-[#3d9996] to-[#01384B] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* Step indicators */}
          <div
            className="grid items-center mt-2"
            style={{ gridTemplateColumns: `repeat(${visibleSteps.length}, 1fr)` }}
          >
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
                    'flex flex-col items-center gap-1 transition-all group py-1',
                    clickable && 'cursor-pointer',
                    !clickable && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <motion.div
                    whileHover={clickable ? { scale: 1.1 } : {}}
                    whileTap={clickable ? { scale: 0.95 } : {}}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      isCurrent && 'bg-gradient-to-br from-[#01384B] to-[#025a6e] text-white ring-2 ring-[#48A9A6]/30 shadow-md',
                      isPast && isCompleted && 'bg-[#48A9A6] text-white',
                      !isCurrent && !isPast && isCompleted && 'bg-[#48A9A6]/70 text-white',
                      !isCurrent && !isCompleted && 'bg-slate-100 border border-slate-200 text-slate-400'
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors text-center leading-tight',
                      isCurrent && 'text-[#01384B] font-semibold',
                      isPast && isCompleted && 'text-[#48A9A6]',
                      !isCurrent && !isPast && isCompleted && 'text-[#48A9A6]',
                      !isCompleted && !isCurrent && 'text-slate-400'
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile layout - Progress only */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[#01384B]">
              {visibleSteps[currentIndex]?.title}
            </p>
            <span className="text-xs text-slate-400">
              {currentIndex + 1}/{totalSteps}
            </span>
          </div>
          {/* Progress bar */}
          <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#48A9A6] to-[#01384B] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
