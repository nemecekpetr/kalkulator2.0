'use client'

import { motion } from 'framer-motion'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_COLORS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard } from '../step-layout'
import { cn } from '@/lib/utils'
import { Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/card'

// 3D Pool visualization with selected color
function PoolColorSVG({
  waterColor,
  shape
}: {
  waterColor: string
  shape: string
}) {
  const strokeColor = '#01384B'

  // Darker shade for walls
  const darkerColor = waterColor + 'cc'
  const darkestColor = waterColor + '99'

  // Circle pool - cylinder
  if (shape === 'circle') {
    const cx = 110
    const cy = 45
    const rx = 45
    const ry = 22
    const depthPx = 35

    return (
      <svg viewBox="0 0 220 120" className="w-full h-36" aria-hidden="true">
        <defs>
          <linearGradient id="circleColorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={waterColor} />
            <stop offset="100%" stopColor={darkestColor} />
          </linearGradient>
        </defs>

        {/* Cylinder wall */}
        <path
          d={`M${cx - rx},${cy} L${cx - rx},${cy + depthPx} A${rx},${ry} 0 0,0 ${cx + rx},${cy + depthPx} L${cx + rx},${cy} A${rx},${ry} 0 0,1 ${cx - rx},${cy}`}
          fill={darkerColor}
          stroke={strokeColor}
          strokeWidth="2"
        />

        {/* Water surface (top ellipse) */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#circleColorGradient)" stroke={strokeColor} strokeWidth="3" />

        {/* Bottom ellipse */}
        <ellipse cx={cx} cy={cy + depthPx} rx={rx - 2} ry={ry - 1} fill={darkestColor} stroke={strokeColor} strokeWidth="1" opacity="0.4" />
      </svg>
    )
  }

  // Rectangle pool - cabinet projection
  const lengthPx = 100
  const widthPx = 35
  const depthPx = 40

  const centerX = 110
  const topY = 30

  const diagX = widthPx * 0.7
  const diagY = widthPx * 0.5

  const c = {
    topBackLeft: { x: centerX - lengthPx/2, y: topY },
    topBackRight: { x: centerX + lengthPx/2, y: topY },
    topFrontLeft: { x: centerX - lengthPx/2 - diagX, y: topY + diagY },
    topFrontRight: { x: centerX + lengthPx/2 - diagX, y: topY + diagY },
    bottomBackLeft: { x: centerX - lengthPx/2, y: topY + depthPx },
    bottomBackRight: { x: centerX + lengthPx/2, y: topY + depthPx },
    bottomFrontLeft: { x: centerX - lengthPx/2 - diagX, y: topY + diagY + depthPx },
    bottomFrontRight: { x: centerX + lengthPx/2 - diagX, y: topY + diagY + depthPx },
  }

  const cornerR = shape === 'rectangle_rounded' ? 6 : 0

  return (
    <svg viewBox="0 0 220 120" className="w-full h-36" aria-hidden="true">
      <defs>
        <linearGradient id="poolColorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={waterColor} />
          <stop offset="100%" stopColor={darkerColor} />
        </linearGradient>
        <linearGradient id="wallColorLeft" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={darkerColor} />
          <stop offset="100%" stopColor={darkestColor} />
        </linearGradient>
        <linearGradient id="wallColorFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={waterColor} />
          <stop offset="100%" stopColor={darkerColor} />
        </linearGradient>
      </defs>

      {/* Left wall */}
      <path
        d={`M${c.topBackLeft.x},${c.topBackLeft.y} L${c.topFrontLeft.x},${c.topFrontLeft.y} L${c.bottomFrontLeft.x},${c.bottomFrontLeft.y} L${c.bottomBackLeft.x},${c.bottomBackLeft.y} Z`}
        fill="url(#wallColorLeft)"
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Front wall */}
      <path
        d={`M${c.topFrontLeft.x},${c.topFrontLeft.y} L${c.topFrontRight.x},${c.topFrontRight.y} L${c.bottomFrontRight.x},${c.bottomFrontRight.y} L${c.bottomFrontLeft.x},${c.bottomFrontLeft.y} Z`}
        fill="url(#wallColorFront)"
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Pool floor */}
      <path
        d={`M${c.bottomBackLeft.x},${c.bottomBackLeft.y} L${c.bottomBackRight.x},${c.bottomBackRight.y} L${c.bottomFrontRight.x},${c.bottomFrontRight.y} L${c.bottomFrontLeft.x},${c.bottomFrontLeft.y} Z`}
        fill={darkestColor}
        stroke={strokeColor}
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Water surface (top) */}
      <path
        d={`M${c.topBackLeft.x + cornerR},${c.topBackLeft.y}
            L${c.topBackRight.x - cornerR},${c.topBackRight.y}
            Q${c.topBackRight.x},${c.topBackRight.y} ${c.topBackRight.x - cornerR * 0.3},${c.topBackRight.y + cornerR * 0.2}
            L${c.topFrontRight.x + cornerR * 0.3},${c.topFrontRight.y - cornerR * 0.2}
            Q${c.topFrontRight.x},${c.topFrontRight.y} ${c.topFrontRight.x - cornerR},${c.topFrontRight.y}
            L${c.topFrontLeft.x + cornerR},${c.topFrontLeft.y}
            Q${c.topFrontLeft.x},${c.topFrontLeft.y} ${c.topFrontLeft.x + cornerR * 0.3},${c.topFrontLeft.y - cornerR * 0.2}
            L${c.topBackLeft.x - cornerR * 0.3},${c.topBackLeft.y + cornerR * 0.2}
            Q${c.topBackLeft.x},${c.topBackLeft.y} ${c.topBackLeft.x + cornerR},${c.topBackLeft.y}
            Z`}
        fill="url(#poolColorGradient)"
        stroke={strokeColor}
        strokeWidth="3"
      />
    </svg>
  )
}

export function StepColor() {
  const color = useConfiguratorStore((state) => state.color)
  const shape = useConfiguratorStore((state) => state.shape)
  const setColor = useConfiguratorStore((state) => state.setColor)

  const selectedColor = POOL_COLORS.find(c => c.id === color)

  return (
    <StepLayout
      title="V jaké barvě má být Váš bazén?"
      description="Barva povrchu ovlivňuje vjem barvy vody"
    >
      <div className="space-y-6">
        {/* 3D Pool preview with selected color */}
        <div className="flex justify-center">
          <div className="w-full max-w-md p-4 rounded-2xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10">
            <motion.div
              key={color}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <PoolColorSVG
                waterColor={selectedColor?.waterColor ?? '#90e0ef'}
                shape={shape || 'rectangle_sharp'}
              />
            </motion.div>
            {/* Color name label - dynamic water color description */}
            <p className="text-center text-sm font-medium text-[#01384B] mt-2">
              {selectedColor
                ? `Orientační barva vody při použití: ${selectedColor.label}`
                : 'Vyberte barvu povrchu'}
            </p>
          </div>
        </div>

        {/* Color options - larger swatches */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {POOL_COLORS.map((poolColor) => (
            <OptionCard
              key={poolColor.id}
              selected={color === poolColor.id}
              onClick={() => setColor(poolColor.id as 'blue' | 'white' | 'gray' | 'combination')}
              className="p-4"
            >
              <div className="flex flex-col items-center text-center">
                {/* Large color swatch */}
                <div
                  className={cn(
                    'w-16 h-16 rounded-xl shadow-md transition-all mb-3',
                    color === poolColor.id && 'ring-4 ring-[#48A9A6]/40 scale-105'
                  )}
                  style={{
                    background: poolColor.id === 'combination'
                      ? `linear-gradient(135deg, ${POOL_COLORS[0].hex} 0%, ${POOL_COLORS[1].hex} 50%, ${POOL_COLORS[2].hex} 100%)`
                      : poolColor.hex,
                    border: poolColor.id === 'white' ? '2px solid #e5e7eb' : 'none'
                  }}
                />

                <h3 className="font-semibold text-foreground text-sm">
                  {poolColor.label}
                </h3>
              </div>
            </OptionCard>
          ))}
        </div>

        {/* Info tip */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip k výběru barvy</h4>
              <p className="text-sm text-slate-600">
                Modrý povrch vytvoří klasickou modrou vodu, šedý povrch azurově modrou a bílý povrch světle tyrkysovou.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </StepLayout>
  )
}
