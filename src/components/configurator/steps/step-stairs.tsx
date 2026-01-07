'use client'

import Image from 'next/image'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { STAIRS_TYPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

// Map stair types to image paths based on pool shape
const STAIRS_IMAGES_ROUNDED: Record<string, string> = {
  'none': '/images/stairs/rounded/none.png',
  'roman': '/images/stairs/rounded/roman.png',
  'corner_triangle': '/images/stairs/rounded/corner-triangle.png',
  'full_width': '/images/stairs/rounded/full-width.png',
  'with_bench': '/images/stairs/rounded/with-bench.png',
  'corner_square': '/images/stairs/rounded/corner-square.png'
}

const STAIRS_IMAGES_SHARP: Record<string, string> = {
  'none': '/images/stairs/sharp/none.png',
  'roman': '/images/stairs/sharp/roman.png',
  'corner_triangle': '/images/stairs/sharp/corner-triangle.png',
  'full_width': '/images/stairs/sharp/full-width.png',
  'with_bench': '/images/stairs/sharp/with-bench.png',
  'corner_square': '/images/stairs/sharp/corner-square.png'
}

export function StepStairs() {
  const stairs = useConfiguratorStore((state) => state.stairs)
  const setStairs = useConfiguratorStore((state) => state.setStairs)
  const shape = useConfiguratorStore((state) => state.shape)

  // This component should only render for non-circle pools
  if (shape === 'circle') {
    return null
  }

  // Select images based on pool shape (rounded vs sharp corners)
  const stairsImages = shape === 'rectangle_sharp' ? STAIRS_IMAGES_SHARP : STAIRS_IMAGES_ROUNDED

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
                  src={stairsImages[stairsType.id]}
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

      {/* Info tip */}
      <Card className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip pro výběr schodiště</h4>
            <p className="text-sm text-slate-600">
              Schodiště zabírá část prostoru bazénu. Románské schodiště je nejoblíbenější volbou pro rodinné bazény.
            </p>
          </div>
        </div>
      </Card>
    </StepLayout>
  )
}
