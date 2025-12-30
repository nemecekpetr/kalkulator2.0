'use client'

import { Check, X } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_TYPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

// SVG visualization showing skimmer vs overflow pool cross-section
function PoolTypeSVG({ typeId }: { typeId: string }) {
  const waterColor = '#7BC4C1'
  const strokeColor = '#01384B'
  const concreteColor = '#e5e7eb'

  if (typeId === 'skimmer') {
    return (
      <svg viewBox="0 0 200 100" className="w-full h-24" aria-hidden="true">
        {/* Pool walls */}
        <rect x="20" y="20" width="160" height="70" fill={concreteColor} stroke={strokeColor} strokeWidth="2" rx="2" />
        {/* Water - lower level */}
        <rect x="24" y="35" width="152" height="51" fill={waterColor} rx="1" />
        {/* Water surface line */}
        <line x1="24" y1="35" x2="176" y2="35" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 2" />
        {/* Skimmer box on right */}
        <rect x="165" y="28" width="12" height="20" fill="white" stroke={strokeColor} strokeWidth="1.5" />
        {/* Arrow showing water flow to skimmer */}
        <path d="M140,38 L158,38" stroke={strokeColor} strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead)" />
        {/* Gap indicator */}
        <line x1="185" y1="20" x2="185" y2="35" stroke={strokeColor} strokeWidth="2" />
        <text x="188" y="18" fontSize="14" fontWeight="600" fill={strokeColor}>15cm</text>
        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={strokeColor} />
          </marker>
        </defs>
      </svg>
    )
  }

  // Overflow type
  return (
    <svg viewBox="0 0 200 100" className="w-full h-24" aria-hidden="true">
      {/* Pool walls */}
      <rect x="20" y="20" width="160" height="70" fill={concreteColor} stroke={strokeColor} strokeWidth="2" rx="2" />
      {/* Water - at top level */}
      <rect x="24" y="24" width="152" height="62" fill={waterColor} rx="1" />
      {/* Overflow channel on right */}
      <rect x="180" y="18" width="15" height="30" fill="white" stroke={strokeColor} strokeWidth="1.5" rx="1" />
      {/* Water flowing over edge */}
      <path d="M176,24 Q180,24 180,28 L180,40" stroke={waterColor} strokeWidth="3" fill="none" />
      {/* Water drops in channel */}
      <circle cx="187" cy="35" r="2" fill={waterColor} />
      <circle cx="185" cy="42" r="1.5" fill={waterColor} />
      {/* Arrows showing water flow */}
      <path d="M150,26 L170,26" stroke={strokeColor} strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead2)" />
      <path d="M187,45 L187,55" stroke={strokeColor} strokeWidth="1" fill="none" markerEnd="url(#arrowhead2)" />
      {/* Label */}
      <text x="183" y="75" fontSize="14" fontWeight="600" fill={strokeColor}>žlab</text>
      {/* Arrow marker */}
      <defs>
        <marker id="arrowhead2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={strokeColor} />
        </marker>
      </defs>
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
                  ? 'Hladina 15 cm pod okrajem'
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
