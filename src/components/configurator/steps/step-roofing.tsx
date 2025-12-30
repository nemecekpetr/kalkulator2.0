'use client'

import { Check, X } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { ROOFING_OPTIONS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Card } from '@/components/ui/card'

// SVG visualization for roofing options
function RoofingSVG({ type }: { type: string }) {
  const waterColor = '#7BC4C1'
  const strokeColor = '#01384B'
  const groundColor = '#d4a574'
  const roofColor = '#94a3b8'
  const glassColor = '#a5d8ff'

  return (
    <svg viewBox="0 0 140 80" className="w-full h-24" aria-hidden="true">
      {/* Ground */}
      <rect x="0" y="55" width="140" height="25" fill={groundColor} opacity="0.3" />
      <line x1="0" y1="55" x2="140" y2="55" stroke={groundColor} strokeWidth="2" />

      {/* Pool */}
      <rect x="30" y="55" width="80" height="20" fill={waterColor} stroke={strokeColor} strokeWidth="2" rx="1" />

      {type === 'none' && (
        // Open pool with sun
        <>
          {/* Sun */}
          <circle cx="110" cy="20" r="12" fill="#FFD93D" stroke="#FF8621" strokeWidth="2" />
          {/* Sun rays */}
          <line x1="110" y1="5" x2="110" y2="0" stroke="#FF8621" strokeWidth="2" />
          <line x1="125" y1="20" x2="130" y2="20" stroke="#FF8621" strokeWidth="2" />
          <line x1="110" y1="35" x2="110" y2="40" stroke="#FF8621" strokeWidth="2" />
          <line x1="95" y1="20" x2="90" y2="20" stroke="#FF8621" strokeWidth="2" />
          <line x1="121" y1="9" x2="125" y2="5" stroke="#FF8621" strokeWidth="2" />
          <line x1="121" y1="31" x2="125" y2="35" stroke="#FF8621" strokeWidth="2" />
          <line x1="99" y1="9" x2="95" y2="5" stroke="#FF8621" strokeWidth="2" />
          <line x1="99" y1="31" x2="95" y2="35" stroke="#FF8621" strokeWidth="2" />
          {/* Leaf falling */}
          <ellipse cx="50" cy="25" rx="6" ry="3" fill="#86c17a" transform="rotate(-30 50 25)" />
          <ellipse cx="75" cy="40" rx="5" ry="2.5" fill="#86c17a" transform="rotate(15 75 40)" />
        </>
      )}

      {type === 'with_roofing' && (
        // Pool with telescopic cover - lower profile
        <>
          {/* Cover segments - telescopic enclosure */}
          <path
            d="M25,55 Q25,38 45,35 L95,35 Q115,38 115,55"
            fill={glassColor}
            fillOpacity="0.4"
            stroke={roofColor}
            strokeWidth="2"
          />
          {/* Frame segments */}
          <path d="M40,55 Q40,42 52,38" fill="none" stroke={roofColor} strokeWidth="1.5" />
          <path d="M60,55 Q60,40 68,37" fill="none" stroke={roofColor} strokeWidth="1.5" />
          <path d="M80,55 Q80,40 80,36" fill="none" stroke={roofColor} strokeWidth="1.5" />
          <path d="M100,55 Q100,42 88,38" fill="none" stroke={roofColor} strokeWidth="1.5" />
          {/* Rails */}
          <line x1="25" y1="55" x2="25" y2="58" stroke={roofColor} strokeWidth="3" />
          <line x1="115" y1="55" x2="115" y2="58" stroke={roofColor} strokeWidth="3" />
        </>
      )}
    </svg>
  )
}

export function StepRoofing() {
  const roofing = useConfiguratorStore((state) => state.roofing)
  const setRoofing = useConfiguratorStore((state) => state.setRoofing)

  return (
    <StepLayout
      title="Chcete bazén zastřešit?"
      description="Zastřešení chrání bazén a prodlužuje koupací sezónu"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {ROOFING_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={roofing === option.id}
            onClick={() => setRoofing(option.id as 'none' | 'with_roofing')}
            className="p-4"
          >
            <div className="space-y-3">
              {/* SVG visualization */}
              <div className="w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 p-3">
                <RoofingSVG type={option.id} />
              </div>

              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
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

              {/* Pros & Cons */}
              <div className="space-y-2 pt-1">
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
                      <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500">{con}</span>
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
        <Card className="mt-4 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200/50">
          <h4 className="font-semibold text-[#01384B] mb-3">Proč se zastřešení vyplatí:</h4>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-medium text-foreground">Úspora na vytápění</p>
              <p className="text-slate-600">Až 70% úspora nákladů na ohřev vody</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Delší sezóna</p>
              <p className="text-slate-600">Koupání od dubna do října</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Méně údržby</p>
              <p className="text-slate-600">Ochrana před listím a hmyzem</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Bezpečnost</p>
              <p className="text-slate-600">Ochrana dětí a domácích mazlíčků</p>
            </div>
          </div>
        </Card>
      )}
    </StepLayout>
  )
}
