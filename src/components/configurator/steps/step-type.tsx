'use client'

import { Check, X } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_TYPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

export function StepType() {
  const type = useConfiguratorStore((state) => state.type)
  const setType = useConfiguratorStore((state) => state.setType)

  return (
    <StepLayout
      title="Jaký typ bazénu si přejete?"
      description="Každý typ má své výhody - vyberte ten, který Vám vyhovuje"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {POOL_TYPES.map((poolType) => (
          <OptionCard
            key={poolType.id}
            selected={type === poolType.id}
            onClick={() => setType(poolType.id as 'skimmer' | 'overflow')}
            className="p-6"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between pr-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-foreground">
                      {poolType.label}
                    </h3>
                    {'tag' in poolType && poolType.tag && (
                      <OptionTag variant={poolType.id === 'overflow' ? 'premium' : 'recommended'}>
                        {poolType.tag}
                      </OptionTag>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {poolType.description}
                  </p>
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid gap-3 pt-2">
                <div className="space-y-1">
                  {poolType.pros.map((pro, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#48A9A6] flex-shrink-0" />
                      <span className="text-foreground">{pro}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {poolType.cons.map((con, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </StepLayout>
  )
}
