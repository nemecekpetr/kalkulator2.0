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

  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-[#48A9A6]/10 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        {/* Progress bar */}
        <div className="relative h-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full overflow-hidden mb-4 shadow-inner">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#48A9A6] via-[#3d9996] to-[#01384B] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          {/* Shine effect */}
          <motion.div
            className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
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
                  'flex flex-col items-center gap-1.5 transition-all group',
                  clickable && 'cursor-pointer',
                  !clickable && 'opacity-40 cursor-not-allowed'
                )}
              >
                <motion.div
                  whileHover={clickable ? { scale: 1.1 } : {}}
                  whileTap={clickable ? { scale: 0.95 } : {}}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-md',
                    isCurrent && 'bg-gradient-to-br from-[#01384B] to-[#025a6e] text-white ring-4 ring-[#48A9A6]/30 shadow-lg shadow-[#01384B]/20',
                    isPast && isCompleted && 'bg-gradient-to-br from-[#48A9A6] to-[#3d9996] text-white shadow-[#48A9A6]/20',
                    !isCurrent && !isPast && isCompleted && 'bg-[#48A9A6]/80 text-white',
                    !isCurrent && !isCompleted && 'bg-white border-2 border-slate-200 text-slate-400'
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </motion.div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
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

        {/* Step indicator - Mobile */}
        <div className="md:hidden flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#01384B] to-[#025a6e] flex items-center justify-center text-white font-bold shadow-lg">
              {currentIndex + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#01384B]">
                Krok {currentIndex + 1} z {totalSteps}
              </p>
              <p className="text-xs text-slate-500">
                {visibleSteps[currentIndex]?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {visibleSteps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={false}
                animate={{
                  width: index === currentIndex ? 20 : 8,
                  backgroundColor: index === currentIndex
                    ? '#01384B'
                    : index < currentIndex
                      ? '#48A9A6'
                      : '#e2e8f0'
                }}
                className="h-2 rounded-full transition-all"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
