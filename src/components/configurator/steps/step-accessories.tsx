'use client'

import { Lightbulb as LightbulbIcon, Waves, Droplets, Lightbulb } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import {
  LIGHTING_OPTIONS,
  COUNTERFLOW_OPTIONS,
  WATER_TREATMENT_OPTIONS
} from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'

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
      <div className="space-y-6">
        {/* Lighting */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LightbulbIcon className="w-5 h-5 text-[#FF8621]" />
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

        {/* Info tip */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip pro úpravu vody</h4>
              <p className="text-sm text-slate-600">
                Elektrolýza soli je šetrnější k pokožce a očím. Voda je měkčí a přirozeně čistící.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </StepLayout>
  )
}
