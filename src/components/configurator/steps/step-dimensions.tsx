'use client'

import { useEffect, useRef, useState } from 'react'
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
import {
  Ruler,
  Lightbulb,
  Waves,
  Baby,
  ChevronDown,
  Droplets
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepDimensions() {
  const shape = useConfiguratorStore((state) => state.shape)
  const dimensions = useConfiguratorStore((state) => state.dimensions)
  const setDimensions = useConfiguratorStore((state) => state.setDimensions)
  const [showDepthTips, setShowDepthTips] = useState(false)

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

  // Calculate approximate volume
  const calculateVolume = () => {
    if (!dimensions?.depth) return null

    if (isCircle && dimensions.diameter) {
      const radius = dimensions.diameter / 2
      return Math.round(Math.PI * radius * radius * dimensions.depth * 1000) / 1000
    }

    if (!isCircle && dimensions.width && dimensions.length) {
      return Math.round(dimensions.width * dimensions.length * dimensions.depth * 1000) / 1000
    }

    return null
  }

  const volume = calculateVolume()

  // Get scale for pool preview (max 200px)
  const getPoolPreviewSize = () => {
    if (isCircle && dimensions?.diameter) {
      const size = Math.min(dimensions.diameter * 35, 180)
      return { width: size, height: size }
    }
    if (!isCircle && dimensions?.length && dimensions?.width) {
      const maxDim = Math.max(dimensions.length, dimensions.width)
      const scale = Math.min(180 / maxDim, 35)
      return {
        width: dimensions.length * scale,
        height: dimensions.width * scale
      }
    }
    return null
  }

  const poolSize = getPoolPreviewSize()

  return (
    <StepLayout
      title="Jaké rozměry má mít Váš bazén?"
      description={isCircle
        ? "Vyberte průměr a hloubku kruhového bazénu"
        : "Vyberte délku, šířku a hloubku bazénu"
      }
    >
      <div className="space-y-6">
        {/* Dimension selectors - improved visual style */}
        <Card className="p-6 space-y-6 border-2 border-slate-200 shadow-md">
          {isCircle ? (
            // Circle dimensions
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="diameter" className="text-sm font-semibold text-[#01384B] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#48A9A6]/10 flex items-center justify-center">
                    <Ruler className="w-3.5 h-3.5 text-[#48A9A6]" />
                  </div>
                  Průměr
                </Label>
                <Select
                  value={dimensions?.diameter?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('diameter', value)}
                >
                  <SelectTrigger
                    id="diameter"
                    ref={firstInputRef}
                    className="w-full h-12 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base"
                  >
                    <SelectValue placeholder="Vyberte průměr" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.circle.diameters.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-3"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="depth" className="text-sm font-semibold text-[#01384B] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#48A9A6]/10 flex items-center justify-center">
                    <Droplets className="w-3.5 h-3.5 text-[#48A9A6]" />
                  </div>
                  Hloubka
                </Label>
                <Select
                  value={dimensions?.depth?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('depth', value)}
                >
                  <SelectTrigger
                    id="depth"
                    className="w-full h-12 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base"
                  >
                    <SelectValue placeholder="Vyberte hloubku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.circle.depths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-3"
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
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-3">
                <Label htmlFor="length" className="text-sm font-semibold text-[#01384B] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#48A9A6]/10 flex items-center justify-center">
                    <Ruler className="w-3.5 h-3.5 text-[#48A9A6]" />
                  </div>
                  Délka
                </Label>
                <Select
                  value={dimensions?.length?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('length', value)}
                >
                  <SelectTrigger
                    id="length"
                    ref={firstInputRef}
                    className="w-full h-12 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base"
                  >
                    <SelectValue placeholder="Vyberte délku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.lengths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-3"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="width" className="text-sm font-semibold text-[#01384B] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#48A9A6]/10 flex items-center justify-center">
                    <Ruler className="w-3.5 h-3.5 text-[#48A9A6] rotate-90" />
                  </div>
                  Šířka
                </Label>
                <Select
                  value={dimensions?.width?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('width', value)}
                >
                  <SelectTrigger
                    id="width"
                    className="w-full h-12 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base"
                  >
                    <SelectValue placeholder="Vyberte šířku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.widths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-3"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="depth" className="text-sm font-semibold text-[#01384B] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#48A9A6]/10 flex items-center justify-center">
                    <Droplets className="w-3.5 h-3.5 text-[#48A9A6]" />
                  </div>
                  Hloubka
                </Label>
                <Select
                  value={dimensions?.depth?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('depth', value)}
                >
                  <SelectTrigger
                    id="depth"
                    className="w-full h-12 border-2 border-slate-200 hover:border-[#48A9A6]/50 focus:border-[#48A9A6] bg-white shadow-sm transition-all text-base"
                  >
                    <SelectValue placeholder="Vyberte hloubku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.depths.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                        className="text-base py-3"
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

        {/* Pool size visualization + Volume */}
        <AnimatePresence>
          {poolSize && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-5 bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 border-[#48A9A6]/30 shadow-md">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Pool visualization */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <p className="text-xs font-semibold text-[#48A9A6] uppercase tracking-wider">
                      Náhled
                    </p>
                    <motion.div
                      key={`${poolSize.width}-${poolSize.height}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "bg-gradient-to-br from-[#48A9A6]/40 to-[#48A9A6]/20 border-2 border-[#48A9A6]/50 shadow-lg flex items-center justify-center",
                        isCircle ? "rounded-full" : shape === 'rectangle_rounded' ? "rounded-3xl" : "rounded-lg"
                      )}
                      style={{
                        width: `${poolSize.width}px`,
                        height: `${poolSize.height}px`,
                        minWidth: '80px',
                        minHeight: '60px'
                      }}
                    >
                      <span className="text-xs font-bold text-[#01384B] text-center px-2">
                        {isCircle
                          ? `Ø ${dimensions?.diameter} m`
                          : `${dimensions?.length} × ${dimensions?.width} m`
                        }
                      </span>
                    </motion.div>
                    {dimensions?.depth && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                        <div className="w-0.5 h-4 bg-gradient-to-b from-blue-300 to-blue-600 rounded-full" />
                        <span className="text-xs font-medium text-blue-700">
                          {dimensions.depth} m hloubka
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Volume info */}
                  {volume && (
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-xs font-semibold text-[#48A9A6] uppercase tracking-wider mb-1">
                        Odhadovaný objem vody
                      </p>
                      <motion.p
                        key={volume}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-[#01384B] leading-none mb-1"
                      >
                        {volume.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} m³
                      </motion.p>
                      <p className="text-sm text-slate-600">
                        ({(volume * 1000).toLocaleString('cs-CZ')} litrů)
                      </p>
                      {/* Practical info */}
                      <div className="mt-3 pt-3 border-t border-[#48A9A6]/20">
                        <p className="text-xs text-slate-500 flex items-center gap-2 justify-center sm:justify-start">
                          <Droplets className="w-3.5 h-3.5 text-[#48A9A6]" />
                          Náklady na naplnění: cca {Math.round(volume * 1000 * 0.1).toLocaleString('cs-CZ')} Kč
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Usage tips - simplified vertical stack with collapsible */}
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-[#01384B] text-base">Tipy pro výběr rozměrů</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Vyberte podle způsobu použití bazénu
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {isCircle ? (
              <>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Baby className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#01384B] mb-1">
                      Menší průměr (1,5–2,5 m)
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ideální pro děti a relaxaci, snadná údržba
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Waves className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#01384B] mb-1">
                      Větší průměr (3,5–4,5 m)
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Umožňuje plavání dokola, vhodný pro celou rodinu
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Waves className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#01384B] mb-1">
                      Délka 6–8 m
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ideální pro plavání, sportovní vyžití
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Baby className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#01384B] mb-1">
                      Délka 4–5 m
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Vhodná pro relaxaci a hru. S protiproudem lze i plavat.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Collapsible depth tips */}
            <button
              onClick={() => setShowDepthTips(!showDepthTips)}
              className="w-full flex items-center justify-between p-2 text-xs text-amber-700 font-medium hover:text-amber-800 transition-colors"
            >
              <span>Tipy k hloubce</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showDepthTips && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {showDepthTips && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-amber-100">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Droplets className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#01384B] mb-1">
                        Hloubka 1,35–1,5 m
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Vhodná pro dospělé, bezpečné stání i plavání
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-amber-100">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Baby className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#01384B] mb-1">
                        Hloubka 1,2 m
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Bezpečnější pro děti a začínající plavce
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </StepLayout>
  )
}
