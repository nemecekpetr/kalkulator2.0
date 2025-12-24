'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
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
      className="flex items-center justify-between mt-8 pt-6 border-t border-border/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Back button */}
      <Button
        variant="outline"
        onClick={prevStep}
        disabled={isFirstStep}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Zpět</span>
      </Button>

      {/* Step info */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {isLastStep ? 'Poslední krok' : `Krok ${currentStep}`}
        </p>
      </div>

      {/* Next/Submit button */}
      {isLastStep ? (
        <Button
          type="submit"
          form="configurator-form"
          disabled={!canGoNext || isSubmitting}
          className="gap-2 bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90"
        >
          {isSubmitting ? (
            <>
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span>Odesílám...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Získat kalkulaci</span>
              <span className="sm:hidden">Odeslat</span>
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={nextStep}
          disabled={!canGoNext}
          className="gap-2 bg-[#01384B] hover:bg-[#01384B]/90"
        >
          <span className="hidden sm:inline">Další</span>
          <span className="sm:hidden">Dále</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  )
}
