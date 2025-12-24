'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Circle, Square, Droplets, Palette, Footprints, Settings, Lightbulb, Thermometer, Home, User } from 'lucide-react'
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
}

function SummaryItem({ icon, label, value }: SummaryItemProps) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-[#48A9A6]/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
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
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Droplets className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Začněte vybírat a zde se zobrazí vaše konfigurace
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Pool basics */}
      <SummaryItem
        icon={<Circle className="w-4 h-4 text-[#48A9A6]" />}
        label="Tvar"
        value={shape ? getShapeLabel(shape) : null}
      />
      <SummaryItem
        icon={<Droplets className="w-4 h-4 text-[#48A9A6]" />}
        label="Typ"
        value={type ? getTypeLabel(type) : null}
      />
      <SummaryItem
        icon={<Square className="w-4 h-4 text-[#48A9A6]" />}
        label="Rozměry"
        value={shape && dimensions ? formatDimensions(shape, dimensions) : null}
      />
      <SummaryItem
        icon={<Palette className="w-4 h-4 text-[#48A9A6]" />}
        label="Barva"
        value={color ? getColorLabel(color) : null}
      />

      {stairs && stairs !== 'none' && shape !== 'circle' && (
        <SummaryItem
          icon={<Footprints className="w-4 h-4 text-[#48A9A6]" />}
          label="Schodiště"
          value={getStairsLabel(stairs)}
        />
      )}

      {technology && (
        <SummaryItem
          icon={<Settings className="w-4 h-4 text-[#48A9A6]" />}
          label="Technologie"
          value={getTechnologyLabel(technology)}
        />
      )}

      {/* Accessories */}
      {(lighting || counterflow || waterTreatment) && (
        <>
          <Separator className="my-3" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Příslušenství
          </p>
          {lighting && lighting !== 'none' && (
            <SummaryItem
              icon={<Lightbulb className="w-4 h-4 text-[#FF8621]" />}
              label="Osvětlení"
              value={getLightingLabel(lighting)}
            />
          )}
          {counterflow && counterflow !== 'none' && (
            <SummaryItem
              icon={<Droplets className="w-4 h-4 text-[#FF8621]" />}
              label="Protiproud"
              value={getCounterflowLabel(counterflow)}
            />
          )}
          {waterTreatment && (
            <SummaryItem
              icon={<Droplets className="w-4 h-4 text-[#FF8621]" />}
              label="Úprava vody"
              value={getWaterTreatmentLabel(waterTreatment)}
            />
          )}
        </>
      )}

      {/* Heating & Roofing */}
      {(heating || roofing) && (
        <>
          <Separator className="my-3" />
          {heating && heating !== 'none' && (
            <SummaryItem
              icon={<Thermometer className="w-4 h-4 text-[#ED6663]" />}
              label="Ohřev"
              value={getHeatingLabel(heating)}
            />
          )}
          {roofing && roofing !== 'none' && (
            <SummaryItem
              icon={<Home className="w-4 h-4 text-[#ED6663]" />}
              label="Zastřešení"
              value={getRoofingLabel(roofing)}
            />
          )}
        </>
      )}

      {/* Contact */}
      {contact?.name && (
        <>
          <Separator className="my-3" />
          <SummaryItem
            icon={<User className="w-4 h-4 text-[#01384B]" />}
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
            className="w-full flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#48A9A6]" />
              <span>Zobrazit konfigurace</span>
            </span>
            <ChevronUp className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-[#48A9A6]" />
              Vaše konfigurace
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-auto">
            <SummaryContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Card className="glass border-[#48A9A6]/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#48A9A6] to-[#01384B] flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          Vaše konfigurace
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
              className="mt-6 pt-4 border-t border-border/50"
            >
              <p className="text-xs text-muted-foreground mb-2">Cenová kategorie</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#48A9A6]/10 text-[#01384B] border-[#48A9A6]/30">
                  Individuální kalkulace
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Přesnou cenu vám spočítáme na míru
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
