'use client'

import { Check, X, Home, Sun } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { ROOFING_OPTIONS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

export function StepRoofing() {
  const roofing = useConfiguratorStore((state) => state.roofing)
  const setRoofing = useConfiguratorStore((state) => state.setRoofing)

  return (
    <StepLayout
      title="Chcete bazén zastřešit?"
      description="Zastřešení chrání bazén a prodlužuje koupací sezónu"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {ROOFING_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={roofing === option.id}
            onClick={() => setRoofing(option.id as 'none' | 'with_roofing')}
            className="p-6"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between pr-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    {option.id === 'with_roofing' ? (
                      <Home className="w-6 h-6 text-[#48A9A6]" />
                    ) : (
                      <Sun className="w-6 h-6 text-[#FF8621]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-foreground">
                        {option.label}
                      </h3>
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
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  {option.pros.map((pro, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#48A9A6] flex-shrink-0" />
                      <span className="text-foreground">{pro}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {option.cons.map((con, index) => (
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

      {/* Benefits highlight */}
      {roofing === 'with_roofing' && (
        <div className="mt-6 p-4 rounded-lg bg-[#48A9A6]/5 border border-[#48A9A6]/20">
          <h4 className="font-semibold text-[#01384B] mb-2">Proč se zastřešení vyplatí:</h4>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-medium text-foreground">Úspora na vytápění</p>
              <p className="text-muted-foreground">Až 70% úspora nákladů na ohřev vody</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Delší sezóna</p>
              <p className="text-muted-foreground">Koupání od dubna do října</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Méně údržby</p>
              <p className="text-muted-foreground">Ochrana před listím a hmyzem</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Bezpečnost</p>
              <p className="text-muted-foreground">Nehrozí utonutí domácích mazlíčků a dětí</p>
            </div>
          </div>
        </div>
      )}
    </StepLayout>
  )
}
