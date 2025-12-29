'use client'

import { motion } from 'framer-motion'
import { Check, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STEPS } from '@/lib/constants/configurator'

interface ConfiguratorProgressProps {
  embedded?: boolean
}

export function ConfiguratorProgress({ embedded = false }: ConfiguratorProgressProps) {
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const canProceed = useConfiguratorStore((state) => state.canProceed)
  const shouldSkipStep = useConfiguratorStore((state) => state.shouldSkipStep)
  const setStep = useConfiguratorStore((state) => state.setStep)
  const prevStep = useConfiguratorStore((state) => state.prevStep)
  const isSubmitted = useConfiguratorStore((state) => state.isSubmitted)

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

  const isFirstStep = currentStep === 1

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
          {/* Top row: Back button + step info */}
          <div className="flex items-center gap-4 mb-3">
            {/* Back button */}
            <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isFirstStep}
                size="sm"
                className="gap-1.5 text-slate-600 hover:text-[#01384B] hover:bg-[#48A9A6]/10 disabled:opacity-0 disabled:pointer-events-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zpět</span>
              </Button>
            </motion.div>

            {/* Step info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-[#01384B]">
                  {visibleSteps[currentIndex]?.title}
                </p>
                <span className="text-xs text-slate-400">
                  Krok {currentIndex + 1} z {totalSteps}
                </span>
              </div>
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

        {/* Mobile layout - Back + Progress */}
        <div className="md:hidden">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={isFirstStep}
              size="sm"
              className="w-9 h-9 p-0 text-slate-600 hover:text-[#01384B] hover:bg-[#48A9A6]/10 disabled:opacity-0 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Center: Progress info */}
            <div className="flex-1">
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
      </div>
    </div>
  )
}
