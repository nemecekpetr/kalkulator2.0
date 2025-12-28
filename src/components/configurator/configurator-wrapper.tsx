'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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

interface ConfiguratorWrapperProps {
  embedded?: boolean
}

export function ConfiguratorWrapper({ embedded = false }: ConfiguratorWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const currentStep = useConfiguratorStore((state) => state.currentStep)
  const shouldSkipStep = useConfiguratorStore((state) => state.shouldSkipStep)
  const containerRef = useRef<HTMLDivElement>(null)

  // Send height to parent window for iframe auto-resize
  const sendHeight = useCallback(() => {
    if (embedded && containerRef.current) {
      const height = containerRef.current.scrollHeight
      window.parent.postMessage({ type: 'resize', height }, '*')
    }
  }, [embedded])

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Send height on mount and step change
  useEffect(() => {
    if (mounted && embedded) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(sendHeight, 100)
      return () => clearTimeout(timer)
    }
  }, [mounted, embedded, currentStep, sendHeight])

  // ResizeObserver for dynamic content changes
  useEffect(() => {
    if (!mounted || !embedded || !containerRef.current) return

    const observer = new ResizeObserver(() => {
      sendHeight()
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [mounted, embedded, sendHeight])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#01384B] via-[#025a6e] to-[#48A9A6]">
        <div className="animate-pulse text-white/80 flex flex-col items-center gap-4">
          <Image
            src="/maskot.png"
            alt="Rentmil maskot"
            width={120}
            height={120}
            className="animate-bounce"
          />
          <span className="text-lg font-medium">Nacitam konfigurator...</span>
        </div>
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

  // Embedded mode - minimal UI for iframe integration
  if (embedded) {
    return (
      <div ref={containerRef} className="bg-white">
        {/* Progress bar */}
        <ConfiguratorProgress />

        {/* Main content */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Step content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8">
                <AnimatePresence mode="wait">
                  {renderStep()}
                </AnimatePresence>

                {/* Navigation */}
                <StepNavigation />
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-4">
                <ConfiguratorSummary />
              </div>
            </div>
          </div>
        </main>

        {/* Mobile summary sheet trigger */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg">
          <ConfiguratorSummary variant="mobile" />
        </div>
      </div>
    )
  }

  // Standalone mode - full UI with header and decorations
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#48A9A6]/5 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#48A9A6]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#01384B]/5 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#01384B] via-[#025a6e] to-[#48A9A6] shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo-blue-gradient.svg"
                alt="Rentmil"
                width={140}
                height={50}
                className="h-10 w-auto brightness-0 invert"
                priority
              />
              <div className="hidden sm:block border-l border-white/20 pl-4">
                <p className="text-white/90 font-medium">Konfigurator bazenu</p>
                <p className="text-white/60 text-xs">Vytvořte si bazén na míru</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-white/90 font-medium">Váš bazénový specialista</p>
                <p className="text-white/60 text-xs">23 let zkušeností</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm p-1 hidden md:block">
                <Image
                  src="/maskot.png"
                  alt="Maskot"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <ConfiguratorProgress />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Step content */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-[#01384B]/5 border border-white/50 p-6 md:p-8">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>

              {/* Navigation */}
              <StepNavigation />
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-32">
              <ConfiguratorSummary />

              {/* Mascot decoration */}
              <div className="mt-6 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#48A9A6]/20 to-transparent rounded-full blur-2xl" />
                  <Image
                    src="/maskot-holding.png"
                    alt="Rentmil maskot"
                    width={180}
                    height={180}
                    className="relative animate-float drop-shadow-lg"
                  />
                </div>
              </div>
              <p className="text-center text-sm text-[#01384B]/70 italic mt-2">
                „Vy zenujete, my bazenujeme."
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile summary sheet trigger */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-[#48A9A6]/20 shadow-lg shadow-black/5">
        <ConfiguratorSummary variant="mobile" />
      </div>

      {/* Footer decoration - visible on larger screens */}
      <div className="hidden lg:block fixed bottom-4 left-4 opacity-50">
        <Image
          src="/maskot.png"
          alt=""
          width={60}
          height={60}
          className="opacity-30"
        />
      </div>
    </div>
  )
}
