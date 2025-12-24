'use client'

import { Thermometer, ThermometerSnowflake, Plug } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { HEATING_OPTIONS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

export function StepHeating() {
  const heating = useConfiguratorStore((state) => state.heating)
  const setHeating = useConfiguratorStore((state) => state.setHeating)

  const getIcon = (heatingId: string) => {
    switch (heatingId) {
      case 'none':
        return <ThermometerSnowflake className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
      case 'preparation':
        return <Plug className="w-10 h-10 text-[#FF8621]" strokeWidth={1.5} />
      case 'heat_pump':
        return <Thermometer className="w-10 h-10 text-[#ED6663]" strokeWidth={1.5} />
      default:
        return null
    }
  }

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
            className="p-5"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-2xl bg-muted/50">
                {getIcon(option.id)}
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
        <div className="mt-6 p-4 rounded-lg bg-[#ED6663]/5 border border-[#ED6663]/20">
          <h4 className="font-semibold text-[#01384B] mb-2">Výhody tepelného čerpadla:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Prodloužení sezóny od března do října</li>
            <li>• Úspora až 80% nákladů oproti elektrickému ohřevu</li>
            <li>• Komfortní teplota 26-28°C</li>
            <li>• Tichý provoz</li>
          </ul>
        </div>
      )}

      {/* Info note */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> Pokud si nejste jisti,
        zvolte alespoň přípravu odbočky - budoucí instalace bude jednodušší a levnější.
      </div>
    </StepLayout>
  )
}
