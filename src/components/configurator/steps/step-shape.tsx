'use client'

import Image from 'next/image'
import { Lightbulb } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_SHAPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Card } from '@/components/ui/card'

// Map shape types to image paths
const SHAPE_IMAGES: Record<string, string> = {
  'circle': '/images/pools/circle.svg',
  'rectangle_rounded': '/images/pools/rectangle-rounded.png',
  'rectangle_sharp': '/images/pools/rectangle-sharp.svg'
}

export function StepShape() {
  const shape = useConfiguratorStore((state) => state.shape)
  const setShape = useConfiguratorStore((state) => state.setShape)

  return (
    <StepLayout
      title="Jaký tvar bazénu preferujete?"
      description="Vyberte základní tvar Vašeho nového bazénu"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {POOL_SHAPES.map((poolShape) => (
          <OptionCard
            key={poolShape.id}
            selected={shape === poolShape.id}
            onClick={() => setShape(poolShape.id as 'circle' | 'rectangle_rounded' | 'rectangle_sharp')}
            label={poolShape.label}
          >
            <div className="flex flex-col items-center text-center pt-2">
              <div className="mb-4 aspect-[2/1] w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 overflow-hidden relative flex items-center justify-center p-4">
                {poolShape.id === 'circle' ? (
                  <svg viewBox="0 0 100 100" className="w-20 h-20" aria-hidden="true">
                    <circle cx="50" cy="50" r="45" fill="#7BC4C1" stroke="#01384B" strokeWidth="3" />
                  </svg>
                ) : poolShape.id === 'rectangle_sharp' ? (
                  <svg viewBox="0 0 200 100" className="w-full h-16" aria-hidden="true">
                    <rect x="5" y="5" width="190" height="90" rx="4" fill="#7BC4C1" stroke="#01384B" strokeWidth="3" />
                  </svg>
                ) : (
                  <Image
                    src={SHAPE_IMAGES[poolShape.id]}
                    alt={poolShape.label}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 mb-1 flex-wrap justify-center">
                <h3 className="font-semibold text-foreground">
                  {poolShape.label}
                </h3>
                {poolShape.tag && (
                  <OptionTag variant={poolShape.tag === 'Nejlevnější' ? 'recommended' : 'default'}>
                    {poolShape.tag}
                  </OptionTag>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {poolShape.description}
              </p>
              {/* Benefits */}
              <div className="flex flex-wrap gap-1 justify-center">
                {poolShape.benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="text-xs text-[#48A9A6] bg-[#48A9A6]/10 px-2 py-0.5 rounded-full"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </OptionCard>
        ))}
      </div>

      {/* Tip box */}
      <Card className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip pro výběr tvaru</h4>
            <p className="text-sm text-slate-600">
              Pro plavání doporučujeme obdélníkový tvar s délkou alespoň 6 m.
              Kruhový bazén je vhodný pro relaxaci a menší zahrady.
            </p>
          </div>
        </div>
      </Card>
    </StepLayout>
  )
}
