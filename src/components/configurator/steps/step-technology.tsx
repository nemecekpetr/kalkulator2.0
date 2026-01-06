'use client'

import { useConfiguratorStore } from '@/stores/configurator-store'
import { TECHNOLOGY_LOCATIONS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

// SVG visualization for technology placement
function TechnologySVG({ type }: { type: string }) {
  const waterColor = '#7BC4C1'
  const strokeColor = '#01384B'
  const groundColor = '#d4a574'
  const techColor = '#94a3b8'

  return (
    <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
      {/* Ground */}
      <rect x="0" y="35" width="120" height="45" fill={groundColor} opacity="0.3" />
      <line x1="0" y1="35" x2="120" y2="35" stroke={groundColor} strokeWidth="2" />

      {/* Pool (cross-section) - top edge at ground level */}
      <rect x="50" y="35" width="45" height="35" fill={waterColor} stroke={strokeColor} strokeWidth="2" rx="1" />

      {type === 'shaft' && (
        // Underground shaft next to pool
        <>
          <rect x="20" y="35" width="20" height="30" fill={techColor} stroke={strokeColor} strokeWidth="2" rx="1" />
          {/* Lid at ground level */}
          <rect x="18" y="33" width="24" height="4" fill={strokeColor} rx="1" />
          {/* Connection pipe */}
          <line x1="40" y1="50" x2="50" y2="50" stroke={strokeColor} strokeWidth="2" />
          {/* Tech equipment inside */}
          <rect x="23" y="42" width="14" height="8" fill={strokeColor} opacity="0.5" rx="1" />
          <rect x="23" y="54" width="14" height="6" fill={strokeColor} opacity="0.5" rx="1" />
        </>
      )}

      {type === 'wall' && (
        // Above-ground wall unit
        <>
          <rect x="15" y="10" width="25" height="25" fill={techColor} stroke={strokeColor} strokeWidth="2" rx="2" />
          {/* Control panel */}
          <rect x="19" y="15" width="17" height="10" fill={strokeColor} opacity="0.3" rx="1" />
          {/* Connection pipe - goes underground */}
          <path d="M27,35 L27,40 L50,40" stroke={strokeColor} strokeWidth="2" fill="none" />
          {/* Base on ground */}
          <rect x="13" y="33" width="29" height="4" fill={strokeColor} opacity="0.5" />
        </>
      )}

      {type === 'other' && (
        // House/building for other location
        <>
          {/* House shape */}
          <rect x="5" y="15" width="30" height="20" fill={techColor} stroke={strokeColor} strokeWidth="2" />
          {/* Roof */}
          <polygon points="5,15 20,3 35,15" fill={techColor} stroke={strokeColor} strokeWidth="2" />
          {/* Door */}
          <rect x="15" y="23" width="10" height="12" fill={strokeColor} opacity="0.4" />
          {/* Connection pipe (underground) */}
          <path d="M35,30 L42,30 L42,45 L50,45" stroke={strokeColor} strokeWidth="2" fill="none" strokeDasharray="3 2" />
        </>
      )}
    </svg>
  )
}

export function StepTechnology() {
  const technology = useConfiguratorStore((state) => state.technology)
  const setTechnology = useConfiguratorStore((state) => state.setTechnology)

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
            className="p-4"
          >
            <div className="flex flex-col items-center text-center">
              {/* SVG visualization */}
              <div className="mb-3 w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 p-3">
                <TechnologySVG type={tech.id} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {tech.label}
              </h3>
              {'tag' in tech && tech.tag && (
                <OptionTag variant="recommended" className="mb-2">
                  {tech.tag}
                </OptionTag>
              )}
              <p className="text-sm text-muted-foreground">
                {tech.description}
              </p>
            </div>
          </OptionCard>
        ))}
      </div>

      {/* Info tip */}
      <Card className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip pro umístění technologie</h4>
            <p className="text-sm text-slate-600">
              Technologická šachta je nejčastější volbou - je kompaktní a umožňuje snadný přístup k technologii.
            </p>
          </div>
        </div>
      </Card>
    </StepLayout>
  )
}
