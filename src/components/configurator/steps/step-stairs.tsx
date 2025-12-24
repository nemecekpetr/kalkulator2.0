'use client'

import Image from 'next/image'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STAIRS_TYPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'

// Map stair types to image paths
const STAIRS_IMAGES: Record<string, string> = {
  'none': '/images/stairs/none.png',
  'roman': '/images/stairs/roman.png',
  'corner_triangle': '/images/stairs/corner-triangle.png',
  'full_width': '/images/stairs/full-width.png',
  'with_bench': '/images/stairs/with-bench.png',
  'corner_square': '/images/stairs/corner-square.png'
}

export function StepStairs() {
  const stairs = useConfiguratorStore((state) => state.stairs)
  const setStairs = useConfiguratorStore((state) => state.setStairs)
  const shape = useConfiguratorStore((state) => state.shape)

  // This component should only render for non-circle pools
  if (shape === 'circle') {
    return null
  }

  return (
    <StepLayout
      title="Jaký typ schodiště preferujete?"
      description="Vyberte způsob vstupu do bazénu"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAIRS_TYPES.map((stairsType) => (
          <OptionCard
            key={stairsType.id}
            selected={stairs === stairsType.id}
            onClick={() => setStairs(stairsType.id as 'none' | 'roman' | 'corner_triangle' | 'full_width' | 'with_bench' | 'corner_square')}
            className="p-4 flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* Stairs image - fixed height container */}
              <div className="h-28 rounded-lg bg-gradient-to-b from-[#48A9A6]/5 to-[#01384B]/5 overflow-hidden relative flex items-center justify-center">
                <Image
                  src={STAIRS_IMAGES[stairsType.id]}
                  alt={stairsType.label}
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              {/* Content */}
              <div className="pt-3 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-foreground">
                    {stairsType.label}
                  </h3>
                  {'tag' in stairsType && stairsType.tag && (
                    <OptionTag variant={stairsType.tag === 'Premium' ? 'premium' : 'recommended'}>
                      {stairsType.tag}
                    </OptionTag>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stairsType.description}
                </p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>

      {/* Info note */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> Schodiště zabírá část prostoru bazénu.
        Románské schodiště je nejoblíbenější volbou pro rodinné bazény.
      </div>
    </StepLayout>
  )
}
