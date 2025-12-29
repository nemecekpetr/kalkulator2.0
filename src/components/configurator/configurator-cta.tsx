'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfiguratorStore } from '@/stores/configurator-store'

export function ConfiguratorCTA() {
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const canProceed = useConfiguratorStore((state) => state.canProceed)
  const nextStep = useConfiguratorStore((state) => state.nextStep)
  const isSubmitted = useConfiguratorStore((state) => state.isSubmitted)
  const isSubmitting = useConfiguratorStore((state) => state.isSubmitting)

  const isLastStep = currentStep === 11
  const canGoNext = canProceed(currentStep)

  // Skrýt po odeslání
  if (isSubmitted) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-[#48A9A6]/20 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Info text - na desktopu */}
          <div className="hidden sm:block flex-1">
            {isLastStep ? (
              <p className="text-sm text-slate-600">
                Zkontrolujte údaje a odešlete nezávaznou poptávku
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                {canGoNext ? 'Pokračujte na další krok' : 'Vyberte možnost pro pokračování'}
              </p>
            )}
          </div>

          {/* CTA Button */}
          {isLastStep ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 sm:flex-none"
            >
              <Button
                type="submit"
                form="configurator-form"
                disabled={!canGoNext || isSubmitting}
                className="w-full sm:w-auto h-12 sm:h-11 gap-2 px-8 bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90 shadow-lg shadow-[#FF8621]/25 text-white font-semibold text-base"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Odesílám...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Získat kalkulaci zdarma</span>
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 sm:flex-none"
            >
              <Button
                onClick={nextStep}
                disabled={!canGoNext}
                className="w-full sm:w-auto h-12 sm:h-11 gap-2 px-8 bg-gradient-to-r from-[#01384B] to-[#025a6e] hover:from-[#01384B]/90 hover:to-[#025a6e]/90 shadow-lg shadow-[#01384B]/20 text-white font-semibold text-base disabled:opacity-40"
              >
                <span>Další krok</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
