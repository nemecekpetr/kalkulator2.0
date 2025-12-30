'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_SHAPES } from '@/lib/constants/configurator'
import { StepLayout, OptionCard, OptionTag } from '../step-layout'
import { Card } from '@/components/ui/card'

// SVG Pool Shape Component with water animation
function PoolShapeSVG({ shapeId, isHovered }: { shapeId: string; isHovered: boolean }) {
  const waterColor = '#7BC4C1'
  const strokeColor = '#01384B'

  // Wave animation - only when hovered
  const waveVariants = {
    idle: { d: 'M0,8 Q25,8 50,8 T100,8 L100,20 L0,20 Z' },
    animated: {
      d: [
        'M0,8 Q25,4 50,8 T100,8 L100,20 L0,20 Z',
        'M0,8 Q25,12 50,8 T100,8 L100,20 L0,20 Z',
        'M0,8 Q25,4 50,8 T100,8 L100,20 L0,20 Z',
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  if (shapeId === 'circle') {
    // Circle uses same viewBox width as rectangles for consistent sizing
    // Circle is centered within the wider viewBox
    return (
      <svg viewBox="0 0 160 80" className="w-full h-20" aria-hidden="true">
        <defs>
          <clipPath id="circleClip">
            <circle cx="80" cy="40" r="35" />
          </clipPath>
        </defs>
        {/* Pool base - centered circle */}
        <circle cx="80" cy="40" r="35" fill={waterColor} stroke={strokeColor} strokeWidth="3" />
        {/* Water wave effect */}
        <g clipPath="url(#circleClip)">
          <motion.path
            fill="rgba(255,255,255,0.3)"
            initial="idle"
            animate={isHovered ? 'animated' : 'idle'}
            variants={{
              idle: { d: 'M45,40 Q62,40 80,40 T115,40 L115,75 L45,75 Z' },
              animated: {
                d: [
                  'M45,40 Q62,35 80,40 T115,40 L115,75 L45,75 Z',
                  'M45,40 Q62,45 80,40 T115,40 L115,75 L45,75 Z',
                  'M45,40 Q62,35 80,40 T115,75 L115,75 L45,75 Z',
                ],
                transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
              },
            }}
          />
        </g>
      </svg>
    )
  }

  // Shared dimensions for all rectangle shapes (2:1 aspect ratio)
  const rectX = 5
  const rectY = 5
  const rectWidth = 150
  const rectHeight = 70

  if (shapeId === 'rectangle_sharp') {
    return (
      <svg viewBox="0 0 160 80" className="w-full h-20" aria-hidden="true">
        <defs>
          <clipPath id="rectSharpClip">
            <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} rx="2" />
          </clipPath>
        </defs>
        {/* Pool base */}
        <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} rx="2" fill={waterColor} stroke={strokeColor} strokeWidth="3" />
        {/* Water wave effect */}
        <g clipPath="url(#rectSharpClip)">
          <motion.path
            fill="rgba(255,255,255,0.3)"
            initial="idle"
            animate={isHovered ? 'animated' : 'idle'}
            variants={{
              idle: { d: 'M5,40 Q40,40 80,40 T155,40 L155,75 L5,75 Z' },
              animated: {
                d: [
                  'M5,40 Q40,35 80,40 T155,40 L155,75 L5,75 Z',
                  'M5,40 Q40,45 80,40 T155,40 L155,75 L5,75 Z',
                  'M5,40 Q40,35 80,40 T155,40 L155,75 L5,75 Z',
                ],
                transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
              },
            }}
          />
        </g>
      </svg>
    )
  }

  // rectangle_rounded
  return (
    <svg viewBox="0 0 160 80" className="w-full h-20" aria-hidden="true">
      <defs>
        <clipPath id="rectRoundedClip">
          <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} rx="20" />
        </clipPath>
      </defs>
      {/* Pool base */}
      <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} rx="20" fill={waterColor} stroke={strokeColor} strokeWidth="3" />
      {/* Water wave effect */}
      <g clipPath="url(#rectRoundedClip)">
        <motion.path
          fill="rgba(255,255,255,0.3)"
          initial="idle"
          animate={isHovered ? 'animated' : 'idle'}
          variants={{
            idle: { d: 'M5,40 Q40,40 80,40 T155,40 L155,75 L5,75 Z' },
            animated: {
              d: [
                'M5,40 Q40,35 80,40 T155,40 L155,75 L5,75 Z',
                'M5,40 Q40,45 80,40 T155,40 L155,75 L5,75 Z',
                'M5,40 Q40,35 80,40 T155,40 L155,75 L5,75 Z',
              ],
              transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            },
          }}
        />
      </g>
    </svg>
  )
}

export function StepShape() {
  const shape = useConfiguratorStore((state) => state.shape)
  const setShape = useConfiguratorStore((state) => state.setShape)
  const [hoveredShape, setHoveredShape] = useState<string | null>(null)

  return (
    <StepLayout
      title="Jaký tvar bazénu preferujete?"
      description="Vyberte základní tvar Vašeho nového bazénu"
    >
      <div className="grid gap-4 sm:grid-cols-3 items-stretch">
        {POOL_SHAPES.map((poolShape) => (
          <OptionCard
            key={poolShape.id}
            selected={shape === poolShape.id}
            onClick={() => setShape(poolShape.id as 'circle' | 'rectangle_rounded' | 'rectangle_sharp')}
            label={poolShape.label}
            onMouseEnter={() => setHoveredShape(poolShape.id)}
            onMouseLeave={() => setHoveredShape(null)}
            className="flex flex-col"
          >
            <div className="flex flex-col items-center text-center pt-2 h-full">
              {/* Unified SVG visualization - fixed height container */}
              <div className="mb-4 h-24 w-full rounded-xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10 overflow-hidden flex items-center justify-center p-4">
                <PoolShapeSVG
                  shapeId={poolShape.id}
                  isHovered={hoveredShape === poolShape.id || shape === poolShape.id}
                />
              </div>

              {/* Title - fixed height for alignment */}
              <h3 className="font-semibold text-foreground text-center min-h-[48px] flex items-center justify-center">
                {poolShape.label}
              </h3>

              {/* Benefits - larger, dark text */}
              <p className="text-sm text-foreground mb-3 text-center flex-grow flex items-center justify-center">
                {poolShape.benefits.join(' • ')}
              </p>

              {/* Tag - at bottom, aligned */}
              <div className="h-7 flex items-center justify-center mt-auto">
                {poolShape.tag && (
                  <OptionTag
                    variant={
                      poolShape.id === 'circle'
                        ? 'recommended'
                        : poolShape.id === 'rectangle_sharp'
                          ? 'premium'
                          : 'default'
                    }
                  >
                    {poolShape.tag}
                  </OptionTag>
                )}
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
