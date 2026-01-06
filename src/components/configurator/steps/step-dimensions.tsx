'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { DIMENSION_OPTIONS } from '@/lib/constants/configurator'
import { StepLayout } from '../step-layout'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Lightbulb, Waves, Baby, Users } from 'lucide-react'

// 3D Isometric Pool visualization with dynamic dimensions
function PoolDimensionsSVG({
  isCircle,
  shape,
  diameter,
  length,
  width,
  depth
}: {
  isCircle: boolean
  shape: string
  diameter?: number
  length?: number
  width?: number
  depth?: number
}) {
  const waterColor = '#7BC4C1'
  const waterColorDark = '#5BA8A5'
  const waterColorDarker = '#4A9794'
  const strokeColor = '#01384B'
  const labelColor = '#01384B'
  const tileColor = '#e0f2f1'

  if (isCircle) {
    // Circle pool in 3D - cylinder
    const minDiameter = 1.5
    const maxDiameter = 4.5
    const minRadius = 30
    const maxRadius = 55
    const minDepthPx = 25
    const maxDepthPx = 50

    const currentDiameter = diameter || 3
    const currentDepth = depth || 1.2
    const radiusPx = minRadius + ((currentDiameter - minDiameter) / (maxDiameter - minDiameter)) * (maxRadius - minRadius)
    const depthPx = minDepthPx + ((currentDepth - 0.5) / (1.5 - 0.5)) * (maxDepthPx - minDepthPx)

    const cx = 110
    const cy = 55

    // Ellipse for isometric circle (squashed vertically)
    const rx = radiusPx
    const ry = radiusPx * 0.5

    return (
      <svg viewBox="0 0 220 140" className="w-full h-40" aria-hidden="true">
        <defs>
          <linearGradient id="waterGradientCircle" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={waterColor} />
            <stop offset="100%" stopColor={waterColorDarker} />
          </linearGradient>
        </defs>

        {/* Pool outer wall (cylinder side) */}
        <path
          d={`M${cx - rx},${cy} L${cx - rx},${cy + depthPx} A${rx},${ry} 0 0,0 ${cx + rx},${cy + depthPx} L${cx + rx},${cy} A${rx},${ry} 0 0,1 ${cx - rx},${cy}`}
          fill={waterColorDark}
          stroke={strokeColor}
          strokeWidth="2"
        />

        {/* Water surface (top ellipse) */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#waterGradientCircle)" stroke={strokeColor} strokeWidth="3" />

        {/* Diameter dimension line */}
        <line x1={cx - rx} y1={cy - ry - 15} x2={cx + rx} y2={cy - ry - 15} stroke={strokeColor} strokeWidth="1.5" />
        <line x1={cx - rx} y1={cy - ry - 20} x2={cx - rx} y2={cy - ry - 10} stroke={strokeColor} strokeWidth="1.5" />
        <line x1={cx + rx} y1={cy - ry - 20} x2={cx + rx} y2={cy - ry - 10} stroke={strokeColor} strokeWidth="1.5" />
        <rect x={cx - 22} y={cy - ry - 32} width="44" height="16" fill="white" rx="2" />
        <text x={cx} y={cy - ry - 20} fontSize="11" fontWeight="600" fill={labelColor} textAnchor="middle">
          {diameter ? `Ø ${diameter} m` : 'Ø ? m'}
        </text>

        {/* Depth dimension (vertical line on side) */}
        <line x1={cx + rx + 15} y1={cy} x2={cx + rx + 15} y2={cy + depthPx} stroke={strokeColor} strokeWidth="1.5" />
        <line x1={cx + rx + 10} y1={cy} x2={cx + rx + 20} y2={cy} stroke={strokeColor} strokeWidth="1.5" />
        <line x1={cx + rx + 10} y1={cy + depthPx} x2={cx + rx + 20} y2={cy + depthPx} stroke={strokeColor} strokeWidth="1.5" />
        <rect x={cx + rx + 22} y={cy + depthPx/2 - 8} width="32" height="16" fill="white" rx="2" />
        <text x={cx + rx + 38} y={cy + depthPx/2 + 4} fontSize="10" fontWeight="600" fill={labelColor} textAnchor="middle">
          {depth ? `${depth} m` : '? m'}
        </text>

        {/* Bottom ellipse (pool floor) */}
        <ellipse cx={cx} cy={cy + depthPx} rx={rx - 2} ry={ry - 1} fill={tileColor} stroke={strokeColor} strokeWidth="1" opacity="0.5" />
      </svg>
    )
  }

  // Rectangle pool - cabinet/oblique projection (top edge stays horizontal)
  const minLength = 4, maxLength = 8
  const minWidth = 2, maxWidth = 4
  const minDepth = 1.2, maxDepth = 1.5

  const currentLength = length || 6
  const currentWidth = width || 3
  const currentDepth = depth || 1.5

  // Scale dimensions to pixels
  const lengthPx = 70 + ((currentLength - minLength) / (maxLength - minLength)) * 60  // 70-130px
  const widthPx = 20 + ((currentWidth - minWidth) / (maxWidth - minWidth)) * 25       // 20-45px (depth into screen)
  const depthPx = 30 + ((currentDepth - minDepth) / (maxDepth - minDepth)) * 20       // 30-50px (vertical)

  const centerX = 110
  const topY = 35

  // Cabinet projection: width goes diagonally down-left at 45 degrees
  const diagX = widthPx * 0.7  // horizontal component
  const diagY = widthPx * 0.5  // vertical component

  // Pool corners (cabinet projection - top edge is horizontal)
  const c = {
    // Top surface (water level)
    topBackLeft: { x: centerX - lengthPx/2, y: topY },
    topBackRight: { x: centerX + lengthPx/2, y: topY },
    topFrontLeft: { x: centerX - lengthPx/2 - diagX, y: topY + diagY },
    topFrontRight: { x: centerX + lengthPx/2 - diagX, y: topY + diagY },
    // Bottom surface
    bottomBackLeft: { x: centerX - lengthPx/2, y: topY + depthPx },
    bottomBackRight: { x: centerX + lengthPx/2, y: topY + depthPx },
    bottomFrontLeft: { x: centerX - lengthPx/2 - diagX, y: topY + diagY + depthPx },
    bottomFrontRight: { x: centerX + lengthPx/2 - diagX, y: topY + diagY + depthPx },
  }

  const isRounded = shape === 'rectangle_rounded'
  const cornerR = isRounded ? 6 : 0

  return (
    <svg viewBox="0 0 220 140" className="w-full h-52" aria-hidden="true">
      <defs>
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={waterColor} />
          <stop offset="100%" stopColor={waterColorDark} />
        </linearGradient>
        <linearGradient id="wallGradientLeft" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={waterColorDark} />
          <stop offset="100%" stopColor={waterColorDarker} />
        </linearGradient>
        <linearGradient id="wallGradientFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={waterColor} />
          <stop offset="100%" stopColor={waterColorDark} />
        </linearGradient>
        <linearGradient id="wallGradientRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={waterColorDark} />
          <stop offset="100%" stopColor={waterColorDarker} />
        </linearGradient>
      </defs>

      {/* Left wall (side) */}
      <path
        d={`M${c.topBackLeft.x},${c.topBackLeft.y} L${c.topFrontLeft.x},${c.topFrontLeft.y} L${c.bottomFrontLeft.x},${c.bottomFrontLeft.y} L${c.bottomBackLeft.x},${c.bottomBackLeft.y} Z`}
        fill="url(#wallGradientLeft)"
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Front wall */}
      <path
        d={`M${c.topFrontLeft.x},${c.topFrontLeft.y} L${c.topFrontRight.x},${c.topFrontRight.y} L${c.bottomFrontRight.x},${c.bottomFrontRight.y} L${c.bottomFrontLeft.x},${c.bottomFrontLeft.y} Z`}
        fill="url(#wallGradientFront)"
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Right wall (side) */}
      <path
        d={`M${c.topFrontRight.x},${c.topFrontRight.y} L${c.topBackRight.x},${c.topBackRight.y} L${c.bottomBackRight.x},${c.bottomBackRight.y} L${c.bottomFrontRight.x},${c.bottomFrontRight.y} Z`}
        fill="url(#wallGradientRight)"
        stroke={strokeColor}
        strokeWidth="2"
      />

      {/* Pool floor visible through front */}
      <path
        d={`M${c.bottomBackLeft.x},${c.bottomBackLeft.y} L${c.bottomBackRight.x},${c.bottomBackRight.y} L${c.bottomFrontRight.x},${c.bottomFrontRight.y} L${c.bottomFrontLeft.x},${c.bottomFrontLeft.y} Z`}
        fill={tileColor}
        stroke={strokeColor}
        strokeWidth="1"
        opacity="0.4"
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
        fill="url(#waterGradient)"
        stroke={strokeColor}
        strokeWidth="3"
      />

      {/* Length dimension (top edge - horizontal) */}
      <line x1={c.topBackLeft.x} y1={c.topBackLeft.y - 12} x2={c.topBackRight.x} y2={c.topBackRight.y - 12} stroke={strokeColor} strokeWidth="1.5" />
      <line x1={c.topBackLeft.x} y1={c.topBackLeft.y - 17} x2={c.topBackLeft.x} y2={c.topBackLeft.y - 7} stroke={strokeColor} strokeWidth="1.5" />
      <line x1={c.topBackRight.x} y1={c.topBackRight.y - 17} x2={c.topBackRight.x} y2={c.topBackRight.y - 7} stroke={strokeColor} strokeWidth="1.5" />
      <rect x={centerX - 18} y={c.topBackLeft.y - 28} width="36" height="16" fill="white" rx="2" />
      <text x={centerX} y={c.topBackLeft.y - 16} fontSize="11" fontWeight="600" fill={labelColor} textAnchor="middle">
        {length ? `${length} m` : '? m'}
      </text>

      {/* Width dimension (diagonal edge - left side) */}
      <line
        x1={c.topBackLeft.x - 10} y1={c.topBackLeft.y - 5}
        x2={c.topFrontLeft.x - 10} y2={c.topFrontLeft.y - 5}
        stroke={strokeColor} strokeWidth="1.5"
      />
      <line x1={c.topBackLeft.x - 15} y1={c.topBackLeft.y - 5} x2={c.topBackLeft.x - 5} y2={c.topBackLeft.y - 5} stroke={strokeColor} strokeWidth="1.5" />
      <line x1={c.topFrontLeft.x - 15} y1={c.topFrontLeft.y - 5} x2={c.topFrontLeft.x - 5} y2={c.topFrontLeft.y - 5} stroke={strokeColor} strokeWidth="1.5" />
      <rect x={c.topFrontLeft.x - 45} y={(c.topBackLeft.y + c.topFrontLeft.y)/2 - 13} width="32" height="16" fill="white" rx="2" />
      <text x={c.topFrontLeft.x - 29} y={(c.topBackLeft.y + c.topFrontLeft.y)/2 - 1} fontSize="11" fontWeight="600" fill={labelColor} textAnchor="middle">
        {width ? `${width} m` : '? m'}
      </text>

      {/* Depth dimension (vertical - front right) */}
      <line x1={c.topFrontRight.x + 12} y1={c.topFrontRight.y} x2={c.bottomFrontRight.x + 12} y2={c.bottomFrontRight.y} stroke={strokeColor} strokeWidth="1.5" />
      <line x1={c.topFrontRight.x + 7} y1={c.topFrontRight.y} x2={c.topFrontRight.x + 17} y2={c.topFrontRight.y} stroke={strokeColor} strokeWidth="1.5" />
      <line x1={c.bottomFrontRight.x + 7} y1={c.bottomFrontRight.y} x2={c.bottomFrontRight.x + 17} y2={c.bottomFrontRight.y} stroke={strokeColor} strokeWidth="1.5" />
      <rect x={c.topFrontRight.x + 20} y={(c.topFrontRight.y + c.bottomFrontRight.y)/2 - 8} width="36" height="16" fill="white" rx="2" />
      <text x={c.topFrontRight.x + 38} y={(c.topFrontRight.y + c.bottomFrontRight.y)/2 + 4} fontSize="10" fontWeight="600" fill={labelColor} textAnchor="middle">
        {depth ? `${depth} m` : '? m'}
      </text>
    </svg>
  )
}

export function StepDimensions() {
  const shape = useConfiguratorStore((state) => state.shape)
  const dimensions = useConfiguratorStore((state) => state.dimensions)
  const setDimensions = useConfiguratorStore((state) => state.setDimensions)

  const isCircle = shape === 'circle'
  const firstInputRef = useRef<HTMLButtonElement>(null)

  // Auto-focus first field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const handleDimensionChange = (key: string, value: string) => {
    setDimensions({
      ...dimensions,
      [key]: parseFloat(value)
    })
  }

  return (
    <StepLayout
      title="Jaké rozměry má mít Váš bazén?"
      description={isCircle
        ? "Vyberte průměr a hloubku kruhového bazénu"
        : "Vyberte délku, šířku a hloubku bazénu"
      }
    >
      <div className="space-y-6">
        {/* SVG Visualization with dimensions */}
        <div className="flex justify-center">
          <div className="w-full max-w-md p-4 rounded-2xl bg-gradient-to-b from-[#48A9A6]/10 to-[#01384B]/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${dimensions?.length}-${dimensions?.width}-${dimensions?.diameter}-${dimensions?.depth}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <PoolDimensionsSVG
                  isCircle={isCircle}
                  shape={shape || 'rectangle_sharp'}
                  diameter={dimensions?.diameter}
                  length={dimensions?.length}
                  width={dimensions?.width}
                  depth={dimensions?.depth}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dimension selectors */}
        <Card className="p-4 space-y-4 border-2 border-slate-200 shadow-md">
          {isCircle ? (
            // Circle dimensions
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="diameter" className="text-sm font-semibold text-[#01384B]">
                  Průměr
                </Label>
                <Select
                  value={dimensions?.diameter?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('diameter', value)}
                >
                  <SelectTrigger
                    id="diameter"
                    ref={firstInputRef}
                    className="w-full h-10 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base font-medium"
                  >
                    <SelectValue placeholder="Vyberte průměr" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.circle.diameters.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-2"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depth" className="text-sm font-semibold text-[#01384B]">
                  Hloubka
                </Label>
                <Select
                  value={dimensions?.depth?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('depth', value)}
                >
                  <SelectTrigger
                    id="depth"
                    className="w-full h-10 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base font-medium"
                  >
                    <SelectValue placeholder="Vyberte hloubku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.circle.depths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-2"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            // Rectangle dimensions
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="length" className="text-sm font-semibold text-[#01384B]">
                  Délka
                </Label>
                <Select
                  value={dimensions?.length?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('length', value)}
                >
                  <SelectTrigger
                    id="length"
                    ref={firstInputRef}
                    className="w-full h-10 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base font-medium"
                  >
                    <SelectValue placeholder="Délka" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.lengths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-2"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="width" className="text-sm font-semibold text-[#01384B]">
                  Šířka
                </Label>
                <Select
                  value={dimensions?.width?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('width', value)}
                >
                  <SelectTrigger
                    id="width"
                    className="w-full h-10 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base font-medium"
                  >
                    <SelectValue placeholder="Šířka" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.widths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-2"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depth" className="text-sm font-semibold text-[#01384B]">
                  Hloubka
                </Label>
                <Select
                  value={dimensions?.depth?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('depth', value)}
                >
                  <SelectTrigger
                    id="depth"
                    className="w-full h-10 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base font-medium"
                  >
                    <SelectValue placeholder="Hloubka" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.depths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-2"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Card>

        {/* Usage tips - simplified, always visible */}
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-[#01384B] text-sm mb-1">Tip pro výběr rozměrů</h4>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isCircle ? (
              <>
                <div className="flex items-start gap-2">
                  <Baby className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Průměr 1,5–2,5 m</p>
                    <p className="text-sm text-slate-600">Pro děti a relaxaci</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Waves className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Průměr 3–4 m</p>
                    <p className="text-sm text-slate-600">Pro celou rodinu</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Baby className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Hloubka 0,5–1 m</p>
                    <p className="text-sm text-slate-600">Pro děti</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Hloubka 1–1,5 m</p>
                    <p className="text-sm text-slate-600">Pro dospělé</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <Waves className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Délka 5–7 m</p>
                    <p className="text-sm text-slate-600">Ideální pro plavání</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">★</span>
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">6 × 3 × 1,5 m</p>
                    <p className="text-sm text-slate-600">Nejprodávanější</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Baby className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Hloubka 1,2–1,3 m</p>
                    <p className="text-sm text-slate-600">Pro menší děti</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#01384B]">Hloubka 1,4–1,5 m</p>
                    <p className="text-sm text-slate-600">Pro dospělé</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </StepLayout>
  )
}
