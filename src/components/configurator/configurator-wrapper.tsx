'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence } from 'framer-motion'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { ConfiguratorProgress } from './configurator-progress'
import { ConfiguratorSummary } from './configurator-summary'
import { StepShape } from './steps/step-shape'
import { StepType } from './steps/step-type'
import { StepDimensions } from './steps/step-dimensions'
import { StepColor } from './steps/step-color'
import { StepStairs } from './steps/step-stairs'
import { StepTechnology } from './steps/step-technology'
import { StepAccessories } from './steps/step-accessories'
import { StepHeating } from './steps/step-heating'
import { StepRoofing } from './steps/step-roofing'
import { StepContact } from './steps/step-contact'
import { StepSummary } from './steps/step-summary'
import { StepNavigation } from './step-navigation'

export function ConfiguratorWrapper() {
  const [mounted, setMounted] = useState(false)
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const shouldSkipStep = useConfiguratorStore((state) => state.shouldSkipStep)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítám konfigurátor...</div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepShape key="step-1" />
      case 2:
        return <StepType key="step-2" />
      case 3:
        return <StepDimensions key="step-3" />
      case 4:
        return <StepColor key="step-4" />
      case 5:
        return shouldSkipStep(5) ? null : <StepStairs key="step-5" />
      case 6:
        return <StepTechnology key="step-6" />
      case 7:
        return <StepAccessories key="step-7" />
      case 8:
        return <StepHeating key="step-8" />
      case 9:
        return <StepRoofing key="step-9" />
      case 10:
        return <StepContact key="step-10" />
      case 11:
        return <StepSummary key="step-11" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Rentmil"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
              <div className="hidden sm:block border-l border-border/50 pl-3">
                <p className="text-xs text-muted-foreground">Konfigurátor bazénu</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-[#01384B]">Váš bazénový mistr</p>
              <p className="text-xs text-muted-foreground">23 let zkušeností</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <ConfiguratorProgress />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Step content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {/* Navigation */}
            <StepNavigation />
          </div>

          {/* Summary sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-32">
              <ConfiguratorSummary />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile summary sheet trigger */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 glass border-t border-border/50">
        <ConfiguratorSummary variant="mobile" />
      </div>
    </div>
  )
}
