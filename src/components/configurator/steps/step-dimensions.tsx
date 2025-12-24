'use client'

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
import { Ruler, Lightbulb, Users, Waves, Baby } from 'lucide-react'

export function StepDimensions() {
  const shape = useConfiguratorStore((state) => state.shape)
  const dimensions = useConfiguratorStore((state) => state.dimensions)
  const setDimensions = useConfiguratorStore((state) => state.setDimensions)

  const isCircle = shape === 'circle'

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

  return (
    <StepLayout
      title="Jaké rozměry má mít Váš bazén?"
      description={isCircle
        ? "Vyberte průměr a hloubku kruhového bazénu"
        : "Vyberte šířku, délku a hloubku bazénu"
      }
    >
      <div className="space-y-6">
        {/* Dimension selectors */}
        <Card className="p-6 space-y-6">
          {isCircle ? (
            // Circle dimensions
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="diameter" className="text-sm font-medium">
                  Průměr
                </Label>
                <Select
                  value={dimensions?.diameter?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('diameter', value)}
                >
                  <SelectTrigger id="diameter" className="w-full">
                    <SelectValue placeholder="Vyberte průměr" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.circle.diameters.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depth" className="text-sm font-medium">
                  Hloubka
                </Label>
                <Select
                  value={dimensions?.depth?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('depth', value)}
                >
                  <SelectTrigger id="depth" className="w-full">
                    <SelectValue placeholder="Vyberte hloubku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.circle.depths.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
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
              <div className="space-y-2">
                <Label htmlFor="length" className="text-sm font-medium">
                  Délka
                </Label>
                <Select
                  value={dimensions?.length?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('length', value)}
                >
                  <SelectTrigger id="length" className="w-full">
                    <SelectValue placeholder="Vyberte délku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.lengths.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="width" className="text-sm font-medium">
                  Šířka
                </Label>
                <Select
                  value={dimensions?.width?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('width', value)}
                >
                  <SelectTrigger id="width" className="w-full">
                    <SelectValue placeholder="Vyberte šířku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.widths.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depth" className="text-sm font-medium">
                  Hloubka
                </Label>
                <Select
                  value={dimensions?.depth?.toString() ?? ''}
                  onValueChange={(value) => handleDimensionChange('depth', value)}
                >
                  <SelectTrigger id="depth" className="w-full">
                    <SelectValue placeholder="Vyberte hloubku" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.rectangle.depths.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Card>

        {/* Volume calculation */}
        {volume && (
          <Card className="p-4 bg-[#48A9A6]/5 border-[#48A9A6]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#48A9A6]/10 flex items-center justify-center">
                <Ruler className="w-5 h-5 text-[#48A9A6]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Odhadovaný objem vody</p>
                <p className="text-lg font-semibold text-[#01384B]">
                  {volume.toLocaleString('cs-CZ')} m³
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({(volume * 1000).toLocaleString('cs-CZ')} litrů)
                  </span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Usage tips */}
        <Card className="p-5 bg-muted/30 border-muted">
          <div className="flex items-start gap-3 mb-4">
            <Lightbulb className="w-5 h-5 text-[#FF8621] mt-0.5 flex-shrink-0" />
            <h4 className="font-semibold text-foreground">Tipy pro výběr rozměrů</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {isCircle ? (
              <>
                <div className="flex items-start gap-3">
                  <Baby className="w-4 h-4 text-[#48A9A6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Menší průměr (1,5–2,5 m)</p>
                    <p className="text-xs text-muted-foreground">Ideální pro děti a relaxaci, snadná údržba</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Waves className="w-4 h-4 text-[#48A9A6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Větší průměr (3,5–4,5 m)</p>
                    <p className="text-xs text-muted-foreground">Umožňuje plavání dokola, vhodný pro celou rodinu</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Waves className="w-4 h-4 text-[#48A9A6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Délka 6–8 m</p>
                    <p className="text-xs text-muted-foreground">Ideální pro plavání, sportovní vyžití</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Baby className="w-4 h-4 text-[#48A9A6] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Délka 4–5 m</p>
                    <p className="text-xs text-muted-foreground">Vhodná pro relaxaci a hru. S protiproudem lze i plavat.</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-[#48A9A6] mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Hloubka 1,35–1,5 m</p>
                <p className="text-xs text-muted-foreground">Vhodná pro dospělé, bezpečné stání i plavání</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Baby className="w-4 h-4 text-[#48A9A6] mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Hloubka 1,2 m</p>
                <p className="text-xs text-muted-foreground">Bezpečnější pro děti a začínající plavce</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </StepLayout>
  )
}
