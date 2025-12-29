'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STEPS } from '@/lib/constants/configurator'

interface ConfiguratorNavigationProps {
  embedded?: boolean
}

export function ConfiguratorNavigation({ embedded = false }: ConfiguratorNavigationProps) {
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const nextStep = useConfiguratorStore((state) => state.nextStep)
  const prevStep = useConfiguratorStore((state) => state.prevStep)
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

  // Hide after submission
  if (isSubmitted) {
    return null
  }

  return (
    <div className="bg-white border-b border-slate-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Back button */}
          <motion.div
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex-shrink-0"
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
  )
}
