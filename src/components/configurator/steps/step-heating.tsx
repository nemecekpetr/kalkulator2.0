'use client'

import { useConfiguratorStore } from '@/stores/configurator-store'
import { HEATING_OPTIONS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

// SVG visualization for heating options
function HeatingSVG({ type }: { type: string }) {
  const waterColor = '#7BC4C1'
  const warmWaterColor = '#ED6663'
  const strokeColor = '#01384B'
  const groundColor = '#d4a574'
  const pumpColor = '#94a3b8'

  return (
    <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
      {/* Ground */}
      <rect x="0" y="35" width="120" height="45" fill={groundColor} opacity="0.3" />
      <line x1="0" y1="35" x2="120" y2="35" stroke={groundColor} strokeWidth="2" />

      {/* Pool - color depends on heating */}
      <rect
        x="50"
        y="35"
        width="45"
        height="35"
        fill={type === 'heat_pump' ? warmWaterColor : waterColor}
        stroke={strokeColor}
        strokeWidth="2"
        rx="1"
        opacity={type === 'heat_pump' ? 0.6 : 1}
      />

      {type === 'none' && (
        // Cold water - snowflake icon
        <>
          <text x="72" y="58" fontSize="16" fill={strokeColor} textAnchor="middle">❄</text>
        </>
      )}

      {type === 'preparation' && (
        // Pipe preparation
        <>
          {/* Pipe stub coming from pool */}
          <rect x="40" y="45" width="12" height="6" fill={pumpColor} stroke={strokeColor} strokeWidth="1.5" rx="1" />
          {/* Cap on pipe */}
          <rect x="38" y="44" width="4" height="8" fill={strokeColor} rx="1" />
          {/* Dotted line showing future pump location */}
          <rect x="10" y="10" width="25" height="25" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 2" rx="2" />
          <text x="22" y="26" fontSize="10" fill={strokeColor} textAnchor="middle">?</text>
        </>
      )}

      {type === 'heat_pump' && (
        // Heat pump unit
        <>
          <rect x="10" y="10" width="28" height="25" fill={pumpColor} stroke={strokeColor} strokeWidth="2" rx="2" />
          {/* Fan grill */}
          <circle cx="24" cy="22" r="8" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="24" y1="14" x2="24" y2="30" stroke={strokeColor} strokeWidth="1" />
          <line x1="16" y1="22" x2="32" y2="22" stroke={strokeColor} strokeWidth="1" />
          {/* Base */}
          <rect x="8" y="33" width="32" height="4" fill={strokeColor} opacity="0.5" />
          {/* Connection pipe */}
          <path d="M38,25 L44,25 L44,45 L50,45" stroke={strokeColor} strokeWidth="2" fill="none" />
          {/* Heat waves in pool */}
          <path d="M60,50 Q63,47 66,50 Q69,53 72,50" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M75,55 Q78,52 81,55 Q84,58 87,55" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
        </>
      )}
    </svg>
  )
}

export function StepHeating() {
  const heating = useConfiguratorStore((state) => state.heating)
  const setHeating = useConfiguratorStore((state) => state.setHeating)

  return (
    <StepLayout
      title="Jak chcete ohřívat vodu?"
      description="Tepelné čerpadlo prodlouží koupací sezónu o několik měsíců"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {HEATING_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={heating === option.id}
            onClick={() => setHeating(option.id as 'none' | 'preparation' | 'heat_pump')}
            className="p-4"
          >
            <div className="flex flex-col items-center text-center">
              {/* SVG visualization */}
              <div className="mb-3 w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 p-3">
                <HeatingSVG type={option.id} />
              </div>
              <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                <h3 className="font-semibold text-foreground">
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
          </OptionCard>
        ))}
      </div>

      {/* Benefits of heat pump */}
      {heating === 'heat_pump' && (
        <Card className="mt-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 border-red-200/50">
          <h4 className="font-semibold text-[#01384B] mb-2">Výhody tepelného čerpadla:</h4>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>• Prodloužení sezóny od března do října</li>
            <li>• Úspora až 80% nákladů oproti elektrickému ohřevu</li>
            <li>• Komfortní teplota 26-30°C</li>
            <li>• Tichý provoz</li>
          </ul>
        </Card>
      )}

      {/* Info tip */}
      <Card className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip pro ohřev</h4>
            <p className="text-sm text-slate-600">
              Pokud si nejste jisti, zvolte alespoň přípravu odbočky - budoucí instalace bude jednodušší a levnější.
            </p>
          </div>
        </div>
      </Card>
    </StepLayout>
  )
}
