'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfiguratorStore } from '@/stores/configurator-store'

export function StepNavigation() {
  // Get entire state to ensure reactivity
  const store = useConfiguratorStore()
  const { currentStep, canProceed, nextStep, prevStep, isSubmitting } = store

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === 11

  // Check if can proceed based on current step data
  const canGoNext = canProceed(currentStep)

  return (
    <motion.div
      className="flex items-center justify-between mt-8 pt-6 border-t border-[#48A9A6]/10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Back button */}
      <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep}
          aria-label="Zpet na predchozi krok"
          className="gap-2 border-slate-200 hover:border-[#48A9A6]/50 hover:bg-[#48A9A6]/5 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Zpet</span>
        </Button>
      </motion.div>

      {/* Step info */}
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#48A9A6] to-[#01384B]" />
          <p className="text-sm font-medium text-slate-500">
            {isLastStep ? 'Posledni krok' : `Krok ${currentStep} z 11`}
          </p>
        </div>
      </div>

      {/* Next/Submit button */}
      {isLastStep ? (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            form="configurator-form"
            disabled={!canGoNext || isSubmitting}
            aria-label={isSubmitting ? 'Odesilam formular' : 'Odeslat formular a ziskat kalkulaci'}
            aria-busy={isSubmitting}
            className="gap-2 bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90 shadow-lg shadow-[#FF8621]/20 text-white font-semibold px-6"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  aria-hidden="true"
                />
                <span>Odesilam...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Ziskat kalkulaci</span>
                <span className="sm:hidden">Odeslat</span>
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={nextStep}
            disabled={!canGoNext}
            aria-label="Dalsi krok"
            className="gap-2 bg-gradient-to-r from-[#01384B] to-[#025a6e] hover:from-[#01384B]/90 hover:to-[#025a6e]/90 shadow-lg shadow-[#01384B]/20 text-white font-semibold px-6 disabled:opacity-30"
          >
            <span className="hidden sm:inline">Dalsi krok</span>
            <span className="sm:hidden">Dale</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
