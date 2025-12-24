'use client'

import Image from 'next/image'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_SHAPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard } from '../step-layout'

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
          >
            <div className="flex flex-col items-center text-center pt-2">
              <div className="mb-4 aspect-[2/1] w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 overflow-hidden relative flex items-center justify-center p-4">
                {poolShape.id === 'circle' ? (
                  <svg viewBox="0 0 100 100" className="w-20 h-20">
                    <circle cx="50" cy="50" r="45" fill="#7BC4C1" stroke="#01384B" strokeWidth="3" />
                  </svg>
                ) : poolShape.id === 'rectangle_sharp' ? (
                  <svg viewBox="0 0 200 100" className="w-full h-16">
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
              <h3 className="font-semibold text-foreground mb-1">
                {poolShape.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {poolShape.description}
              </p>
            </div>
          </OptionCard>
        ))}
      </div>
    </StepLayout>
  )
}
