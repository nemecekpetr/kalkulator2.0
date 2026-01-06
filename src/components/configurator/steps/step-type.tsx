'use client'

import { Check, X } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_TYPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

// SVG visualization showing skimmer vs overflow pool - top view (půdorys)
function PoolTypeSVG({ typeId }: { typeId: string }) {
  const waterColor = '#7BC4C1'
  const strokeColor = '#01384B'
  const edgeColor = '#d1d5db' // gray-300 for pool edge

  if (typeId === 'skimmer') {
    // Top view - skimmer box on OUTER side of pool (outside the water)
    return (
      <svg viewBox="0 0 200 100" className="w-full h-full" aria-hidden="true">
        {/* Pool edge/coping */}
        <rect x="15" y="8" width="170" height="70" fill={edgeColor} stroke={strokeColor} strokeWidth="2" rx="3" />
        {/* Water surface */}
        <rect x="22" y="15" width="156" height="56" fill={waterColor} rx="2" />
        {/* Skimmer box - on OUTER side (right edge, outside the pool) */}
        <rect x="185" y="29" width="12" height="28" fill="white" stroke={strokeColor} strokeWidth="2" rx="1" />
        {/* Skimmer opening detail - slot facing pool */}
        <rect x="185" y="35" width="3" height="16" fill={strokeColor} opacity="0.4" rx="0.5" />
        {/* Connection line from pool to skimmer */}
        <line x1="178" y1="43" x2="185" y2="43" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="2 2" />
        {/* Label */}
        <text x="100" y="93" fontSize="12" fontWeight="600" fill={strokeColor} textAnchor="middle">skimmer</text>
      </svg>
    )
  }

  // Overflow type - top view with overflow channel (grate/rošt) around perimeter
  // Grate lines are perpendicular to pool edge, light gray color
  const grateColor = '#9ca3af' // gray-400

  return (
    <svg viewBox="0 0 200 100" className="w-full h-full" aria-hidden="true">
      {/* Outer edge / deck */}
      <rect x="5" y="8" width="190" height="70" fill={edgeColor} stroke={strokeColor} strokeWidth="2" rx="3" />

      {/* Grate lines - top (vertical lines) - full width including corners */}
      {[...Array(46)].map((_, i) => (
        <line key={`top-${i}`} x1={8 + i * 4} y1="11" x2={8 + i * 4} y2="20" stroke={grateColor} strokeWidth="1" />
      ))}

      {/* Grate lines - bottom (vertical lines) - full width including corners */}
      {[...Array(46)].map((_, i) => (
        <line key={`bottom-${i}`} x1={8 + i * 4} y1="66" x2={8 + i * 4} y2="75" stroke={grateColor} strokeWidth="1" />
      ))}

      {/* Grate lines - left (horizontal lines) - middle only, no corners */}
      {[...Array(12)].map((_, i) => (
        <line key={`left-${i}`} x1="8" y1={20 + i * 4} x2="17" y2={20 + i * 4} stroke={grateColor} strokeWidth="1" />
      ))}

      {/* Grate lines - right (horizontal lines) - middle only, no corners */}
      {[...Array(12)].map((_, i) => (
        <line key={`right-${i}`} x1="183" y1={20 + i * 4} x2="192" y2={20 + i * 4} stroke={grateColor} strokeWidth="1" />
      ))}

      {/* Water surface - inner pool */}
      <rect x="17" y="20" width="166" height="46" fill={waterColor} stroke={strokeColor} strokeWidth="1.5" rx="1" />

      {/* Label */}
      <text x="100" y="93" fontSize="12" fontWeight="600" fill={strokeColor} textAnchor="middle">přelivový žlab</text>
    </svg>
  )
}

export function StepType() {
  const type = useConfiguratorStore((state) => state.type)
  const setType = useConfiguratorStore((state) => state.setType)

  return (
    <StepLayout
      title="Jaký typ bazénu si přejete?"
      description="Vyberte technické řešení hladiny vody"
    >
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {POOL_TYPES.map((poolType) => (
          <OptionCard
            key={poolType.id}
            selected={type === poolType.id}
            onClick={() => setType(poolType.id as 'skimmer' | 'overflow')}
            className="p-6 flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* SVG visualization */}
              <div className="mb-4 h-28 w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 overflow-hidden flex items-center justify-center p-3">
                <PoolTypeSVG typeId={poolType.id} />
              </div>

              {/* Title */}
              <h3 className="font-semibold text-lg text-foreground text-center mb-2">
                {poolType.label}
              </h3>

              {/* Simple description */}
              <p className="text-sm text-foreground text-center mb-4">
                {poolType.id === 'skimmer'
                  ? 'Hladina 10 cm pod okrajem'
                  : 'Hladina u okraje, voda přetéká'}
              </p>

              {/* Pros & Cons */}
              <div className="space-y-2 flex-grow">
                {poolType.pros.map((pro, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-[#48A9A6] flex-shrink-0" />
                    <span className="text-foreground">{pro}</span>
                  </div>
                ))}
                {poolType.cons.map((con, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500">{con}</span>
                  </div>
                ))}
              </div>

              {/* Tag at bottom */}
              <div className="h-8 flex items-center justify-center mt-4">
                {'tag' in poolType && poolType.tag && (
                  <OptionTag variant={poolType.id === 'overflow' ? 'premium' : 'recommended'}>
                    {poolType.tag}
                  </OptionTag>
                )}
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </StepLayout>
  )
}
