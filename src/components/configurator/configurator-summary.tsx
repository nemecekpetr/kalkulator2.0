'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Circle, Square, Droplets, Palette, Footprints, Settings, Lightbulb, Thermometer, Home, User, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useConfiguratorStore } from '@/stores/configurator-store'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getLightingLabel,
  getCounterflowLabel,
  getWaterTreatmentLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions
} from '@/lib/constants/configurator'

interface SummaryItemProps {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  highlight?: boolean
}

function SummaryItem({ icon, label, value, highlight }: SummaryItemProps) {
  if (!value) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-2.5"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
        highlight
          ? 'bg-gradient-to-br from-[#FF8621] to-[#ED6663]'
          : 'bg-gradient-to-br from-[#48A9A6]/20 to-[#01384B]/10'
      }`}>
        <div className={highlight ? 'text-white' : 'text-[#48A9A6]'}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-[#01384B] truncate">{value}</p>
      </div>
    </motion.div>
  )
}

function SummaryContent() {
  const {
    shape,
    type,
    dimensions,
    color,
    stairs,
    technology,
    lighting,
    counterflow,
    waterTreatment,
    heating,
    roofing,
    contact
  } = useConfiguratorStore()

  const hasAnyData = shape || type || dimensions || color

  if (!hasAnyData) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#48A9A6]/10 to-[#01384B]/5 flex items-center justify-center">
          <Droplets className="w-10 h-10 text-[#48A9A6]" />
        </div>
        <p className="text-sm text-slate-500 font-medium">
          Začněte vybírat a zde se zobrazí vaše konfigurace
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Každý váš výběr se automaticky uloží
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Pool basics */}
      <SummaryItem
        icon={<Circle className="w-4 h-4" />}
        label="Tvar"
        value={shape ? getShapeLabel(shape) : null}
      />
      <SummaryItem
        icon={<Droplets className="w-4 h-4" />}
        label="Typ"
        value={type ? getTypeLabel(type) : null}
      />
      <SummaryItem
        icon={<Square className="w-4 h-4" />}
        label="Rozmery"
        value={shape && dimensions ? formatDimensions(shape, dimensions) : null}
      />
      <SummaryItem
        icon={<Palette className="w-4 h-4" />}
        label="Barva"
        value={color ? getColorLabel(color) : null}
      />

      {stairs && stairs !== 'none' && shape !== 'circle' && (
        <SummaryItem
          icon={<Footprints className="w-4 h-4" />}
          label="Schodiště"
          value={getStairsLabel(stairs)}
        />
      )}

      {technology && (
        <SummaryItem
          icon={<Settings className="w-4 h-4" />}
          label="Technologie"
          value={getTechnologyLabel(technology)}
        />
      )}

      {/* Accessories */}
      {(lighting || counterflow || waterTreatment) && (
        <>
          <Separator className="my-3 bg-gradient-to-r from-transparent via-[#48A9A6]/20 to-transparent" />
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3 h-3 text-[#FF8621]" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Příslušenství
            </p>
          </div>
          {lighting && lighting !== 'none' && (
            <SummaryItem
              icon={<Lightbulb className="w-4 h-4" />}
              label="Osvětlení"
              value={getLightingLabel(lighting)}
              highlight
            />
          )}
          {counterflow && counterflow !== 'none' && (
            <SummaryItem
              icon={<Droplets className="w-4 h-4" />}
              label="Protiproud"
              value={getCounterflowLabel(counterflow)}
              highlight
            />
          )}
          {waterTreatment && (
            <SummaryItem
              icon={<Droplets className="w-4 h-4" />}
              label="Úprava vody"
              value={getWaterTreatmentLabel(waterTreatment)}
              highlight
            />
          )}
        </>
      )}

      {/* Heating & Roofing */}
      {(heating || roofing) && (
        <>
          <Separator className="my-3 bg-gradient-to-r from-transparent via-[#48A9A6]/20 to-transparent" />
          {heating && heating !== 'none' && (
            <SummaryItem
              icon={<Thermometer className="w-4 h-4" />}
              label="Ohřev"
              value={getHeatingLabel(heating)}
            />
          )}
          {roofing && roofing !== 'none' && (
            <SummaryItem
              icon={<Home className="w-4 h-4" />}
              label="Zastřešení"
              value={getRoofingLabel(roofing)}
            />
          )}
        </>
      )}

      {/* Contact */}
      {contact?.name && (
        <>
          <Separator className="my-3 bg-gradient-to-r from-transparent via-[#48A9A6]/20 to-transparent" />
          <SummaryItem
            icon={<User className="w-4 h-4" />}
            label="Kontakt"
            value={contact.name}
          />
        </>
      )}
    </div>
  )
}

interface ConfiguratorSummaryProps {
  variant?: 'desktop' | 'mobile'
}

export function ConfiguratorSummary({ variant = 'desktop' }: ConfiguratorSummaryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentStep = useConfiguratorStore((state) => state.currentStep)

  if (variant === 'mobile') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex items-center justify-between bg-white border-[#48A9A6]/30 hover:bg-[#48A9A6]/5 hover:border-[#48A9A6]/50"
          >
            <span className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#48A9A6] to-[#01384B] flex items-center justify-center">
                <Droplets className="w-3 h-3 text-white" />
              </div>
              <span className="font-medium text-[#01384B]">Zobrazit konfiguraci</span>
            </span>
            <ChevronUp className={`w-4 h-4 text-[#48A9A6] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-[#48A9A6]/10">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#48A9A6] to-[#01384B] flex items-center justify-center shadow-lg">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[#01384B]">Vaše konfigurace</span>
                <p className="text-xs text-slate-500 font-normal">Přehled vybraných možností</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-auto pb-20">
            <SummaryContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-[#48A9A6]/20 shadow-xl shadow-[#01384B]/5 overflow-hidden">
      {/* Decorative header gradient */}
      <div className="h-1 bg-gradient-to-r from-[#48A9A6] via-[#3d9996] to-[#01384B]" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#48A9A6] to-[#01384B] flex items-center justify-center shadow-lg shadow-[#48A9A6]/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[#01384B]">Vaše konfigurace</span>
            <p className="text-xs text-slate-500 font-normal">Automaticky ukládáno</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SummaryContent />

        {/* Value indicators */}
        <AnimatePresence>
          {currentStep >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 pt-4 border-t border-[#48A9A6]/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#48A9A6] to-[#01384B] animate-pulse" />
                <p className="text-xs text-slate-500 font-medium">Cenová kategorie</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-[#48A9A6]/10 to-[#01384B]/10 text-[#01384B] border-[#48A9A6]/30 hover:bg-[#48A9A6]/20">
                  Individuální kalkulace
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Přesnou cenu vám spočítáme na míru
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
