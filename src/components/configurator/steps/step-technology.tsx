'use client'

import { Box, Layers, Home } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { TECHNOLOGY_LOCATIONS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

export function StepTechnology() {
  const technology = useConfiguratorStore((state) => state.technology)
  const setTechnology = useConfiguratorStore((state) => state.setTechnology)

  const getIcon = (techId: string) => {
    switch (techId) {
      case 'shaft':
        return <Box className="w-10 h-10 text-[#48A9A6]" strokeWidth={1.5} />
      case 'wall':
        return <Layers className="w-10 h-10 text-[#48A9A6]" strokeWidth={1.5} />
      case 'other':
        return <Home className="w-10 h-10 text-[#48A9A6]" strokeWidth={1.5} />
      default:
        return null
    }
  }

  return (
    <StepLayout
      title="Kam umístit technologii?"
      description="Vyberte, kde bude umístěno filtrační a ohřevné zařízení"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {TECHNOLOGY_LOCATIONS.map((tech) => (
          <OptionCard
            key={tech.id}
            selected={technology === tech.id}
            onClick={() => setTechnology(tech.id as 'shaft' | 'wall' | 'other')}
            className="p-5"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-2xl bg-muted/50">
                {getIcon(tech.id)}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">
                  {tech.label}
                </h3>
                {'tag' in tech && tech.tag && (
                  <OptionTag variant="recommended">
                    {tech.tag}
                  </OptionTag>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {tech.description}
              </p>
            </div>
          </OptionCard>
        ))}
      </div>

      {/* Info note */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> Technická šachta je nejčastější volbou -
        je kompaktní a umožňuje snadný přístup k technologii.
      </div>
    </StepLayout>
  )
}
