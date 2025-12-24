'use client'

import { Lightbulb, Waves, Droplets } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import {
  LIGHTING_OPTIONS,
  COUNTERFLOW_OPTIONS,
  WATER_TREATMENT_OPTIONS
} from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Separator } from '@/components/ui/separator'

export function StepAccessories() {
  const lighting = useConfiguratorStore((state) => state.lighting)
  const counterflow = useConfiguratorStore((state) => state.counterflow)
  const waterTreatment = useConfiguratorStore((state) => state.waterTreatment)
  const setLighting = useConfiguratorStore((state) => state.setLighting)
  const setCounterflow = useConfiguratorStore((state) => state.setCounterflow)
  const setWaterTreatment = useConfiguratorStore((state) => state.setWaterTreatment)

  return (
    <StepLayout
      title="Jaké příslušenství si přejete?"
      description="Vyberte doplňky, které zvýší komfort Vašeho bazénu"
    >
      <div className="space-y-8">
        {/* Lighting */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#FF8621]" />
            <h3 className="font-semibold text-foreground">Osvětlení</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {LIGHTING_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                selected={lighting === option.id}
                onClick={() => setLighting(option.id as 'none' | 'led')}
                className="p-4"
              >
                <div className="pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">
                      {option.label}
                    </h4>
                    {'tag' in option && option.tag && (
                      <OptionTag variant="recommended">
                        {option.tag}
                      </OptionTag>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        <Separator />

        {/* Counterflow */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-[#48A9A6]" />
            <h3 className="font-semibold text-foreground">Protiproud</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {COUNTERFLOW_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                selected={counterflow === option.id}
                onClick={() => setCounterflow(option.id as 'none' | 'with_counterflow')}
                className="p-4"
              >
                <div className="pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">
                      {option.label}
                    </h4>
                    {'tag' in option && option.tag && (
                      <OptionTag variant="default">
                        {option.tag}
                      </OptionTag>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        <Separator />

        {/* Water Treatment */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-[#01384B]" />
            <h3 className="font-semibold text-foreground">Úprava vody</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WATER_TREATMENT_OPTIONS.map((option) => (
              <OptionCard
                key={option.id}
                selected={waterTreatment === option.id}
                onClick={() => setWaterTreatment(option.id as 'chlorine' | 'salt')}
                className="p-4"
              >
                <div className="pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">
                      {option.label}
                    </h4>
                    {'tag' in option && option.tag && (
                      <OptionTag variant={option.id === 'salt' ? 'premium' : 'default'}>
                        {option.tag}
                      </OptionTag>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="p-4 rounded-lg bg-[#48A9A6]/5 border border-[#48A9A6]/20 text-sm">
          <strong className="text-[#01384B]">Slaná voda:</strong>{' '}
          <span className="text-muted-foreground">
            Elektrolýza soli je šetrnější k pokožce a očím. Voda je měkčí a přirozeně čistící.
          </span>
        </div>
      </div>
    </StepLayout>
  )
}
