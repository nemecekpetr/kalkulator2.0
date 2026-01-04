'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STEPS } from '@/lib/constants/configurator'

interface ConfiguratorNavigationProps {
  embedded?: boolean
}

export function ConfiguratorNavigation({ embedded = false }: ConfiguratorNavigationProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const nextStep = useConfiguratorStore((state) => state.nextStep)
  const prevStep = useConfiguratorStore((state) => state.prevStep)
  const reset = useConfiguratorStore((state) => state.reset)
  const shouldSkipStep = useConfiguratorStore((state) => state.shouldSkipStep)
  const isSubmitted = useConfiguratorStore((state) => state.isSubmitted)
  const isSubmitting = useConfiguratorStore((state) => state.isSubmitting)

  // Subscribe to canProceed result directly to ensure re-render on state changes
  // This is necessary because canProceed is a function that reads state internally
  const canGoNext = useConfiguratorStore((state) => state.canProceed(state.currentStep))

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === 11

  // Calculate visible steps for step counter
  const visibleSteps = STEPS.filter(step => !shouldSkipStep(step.number))
  const totalSteps = visibleSteps.length
  const currentIndex = visibleSteps.findIndex(step => step.number === currentStep)

  const handleReset = () => {
    reset()
    setShowResetConfirm(false)
  }

  // Hide after submission
  if (isSubmitted) {
    return null
  }

  return (
    <>
      {/* Reset confirmation dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-20 md:pt-32"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-[#01384B] mb-2">
                Začít znovu?
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                Opravdu chcete smazat dosavadní konfiguraci a začít od začátku?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Zrušit
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleReset}
                >
                  Ano, začít znovu
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: static under progress bar, Mobile: fixed at bottom (wrapper handles positioning in embedded mode) */}
      <div className={`
        bg-white border-slate-100 z-50
        ${embedded
          ? 'border-t shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:border-t-0 md:border-b md:shadow-none'
          : 'fixed bottom-0 left-0 right-0 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:static md:border-t-0 md:border-b md:shadow-none'
        }
      `}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Reset + Back */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Reset button - only show if not on first step */}
              {!isFirstStep && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowResetConfirm(true)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Začít znovu"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>
              )}

              {/* Back button */}
              <motion.div
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className="gap-2 h-10 px-4 border-slate-200 hover:border-[#48A9A6]/50 hover:bg-[#48A9A6]/5 disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Zpět</span>
                </Button>
              </motion.div>
            </div>

            {/* Step counter - center */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Krok</span>
              <span className="font-bold text-[#01384B]">{currentIndex + 1}</span>
              <span className="text-slate-400">z</span>
              <span className="font-medium text-slate-600">{totalSteps}</span>
            </div>

          {/* Next/Submit button */}
          {isLastStep ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-shrink-0"
            >
              <Button
                type="submit"
                form="configurator-form"
                disabled={!canGoNext || isSubmitting}
                className="gap-2 h-10 px-5 bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90 shadow-lg shadow-[#FF8621]/20 text-white font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="hidden sm:inline">Odesílám...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Získat kalkulaci</span>
                    <span className="sm:hidden">Odeslat</span>
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="flex-shrink-0"
            >
              <Button
                onClick={nextStep}
                disabled={!canGoNext}
                className="gap-2 h-10 px-5 bg-gradient-to-r from-[#01384B] to-[#025a6e] hover:from-[#01384B]/90 hover:to-[#025a6e]/90 shadow-lg shadow-[#01384B]/15 text-white font-semibold disabled:opacity-40"
              >
                <span className="hidden sm:inline">Další krok</span>
                <span className="sm:hidden">Dále</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
          </div>
        </div>
      </div>
    </>
  )
}
