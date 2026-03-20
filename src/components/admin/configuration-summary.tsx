'use client'

import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
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
} from '@/lib/constants/configurator'

interface ConfigurationSummaryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  isSubmitting: boolean
  mode: 'create' | 'edit'
}

interface Section {
  label: string
  fields: { key: string; label: string; getValue: () => string }[]
}

export function ConfigurationSummary({ form, isSubmitting, mode }: ConfigurationSummaryProps) {
  const values = form.watch()

  const sections: Section[] = [
    {
      label: 'Základní parametry',
      fields: [
        { key: 'pool_shape', label: 'Tvar', getValue: () => values.pool_shape ? getShapeLabel(values.pool_shape) : '' },
        { key: 'pool_type', label: 'Typ', getValue: () => values.pool_type ? getTypeLabel(values.pool_type) : '' },
        {
          key: 'dimensions',
          label: 'Rozměry',
          getValue: () => {
            if (values.pool_shape === 'circle') {
              return values.diameter && values.depth ? `⌀${values.diameter} × ${values.depth} m` : ''
            }
            return values.length && values.width && values.depth
              ? `${values.length} × ${values.width} × ${values.depth} m`
              : ''
          },
        },
      ],
    },
    {
      label: 'Vzhled',
      fields: [
        { key: 'color', label: 'Barva', getValue: () => values.color ? getColorLabel(values.color) : '' },
        { key: 'stairs', label: 'Schodiště', getValue: () => values.stairs ? getStairsLabel(values.stairs) : '' },
      ],
    },
    {
      label: 'Technologie & Příslušenství',
      fields: [
        { key: 'technology', label: 'Technologie', getValue: () => values.technology ? getTechnologyLabel(values.technology) : '' },
        { key: 'lighting', label: 'Osvětlení', getValue: () => values.lighting ? getLightingLabel(values.lighting) : '' },
        { key: 'counterflow', label: 'Protiproud', getValue: () => values.counterflow ? getCounterflowLabel(values.counterflow) : '' },
        {
          key: 'water_treatment',
          label: 'Úprava vody',
          getValue: () => values.water_treatment ? getWaterTreatmentLabel(values.water_treatment, values.water_treatment_other) : '',
        },
      ],
    },
    {
      label: 'Komfort',
      fields: [
        { key: 'heating', label: 'Ohřev', getValue: () => values.heating ? getHeatingLabel(values.heating) : '' },
        { key: 'roofing', label: 'Zastřešení', getValue: () => values.roofing ? getRoofingLabel(values.roofing) : '' },
      ],
    },
  ]

  // Calculate completeness — required pool fields only (not contact)
  const requiredFields = values.pool_shape === 'circle'
    ? ['pool_shape', 'pool_type', 'diameter', 'depth', 'color', 'stairs', 'technology', 'lighting', 'counterflow', 'water_treatment', 'heating', 'roofing']
    : ['pool_shape', 'pool_type', 'length', 'width', 'depth', 'color', 'stairs', 'technology', 'lighting', 'counterflow', 'water_treatment', 'heating', 'roofing']

  const filledCount = requiredFields.filter(f => {
    const val = values[f]
    return val !== undefined && val !== null && val !== ''
  }).length
  const percentage = Math.round((filledCount / requiredFields.length) * 100)

  const isSectionComplete = (section: Section) =>
    section.fields.every(f => f.getValue() !== '')

  return (
    <div className="sticky top-5 hidden lg:block">
      <Card className="overflow-hidden">
        {/* Header with progress */}
        <div className="bg-[#01384B] text-white p-5">
          <h3 className="text-base font-semibold mb-2">Shrnutí konfigurace</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded h-2">
              <div
                className="bg-[#48A9A6] rounded h-2 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm opacity-80">{percentage}%</span>
          </div>
        </div>

        {/* Summary sections */}
        <CardContent className="p-5 text-sm max-h-[calc(100vh-200px)] overflow-y-auto">
          {sections.map((section, i) => {
            const complete = isSectionComplete(section)
            return (
              <div key={section.label}>
                {i > 0 && <div className="border-t my-3" />}
                <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${complete ? 'text-[#48A9A6]' : 'text-muted-foreground'}`}>
                  {complete ? '✓' : '○'} {section.label}
                </div>
                {section.fields.map(field => {
                  const value = field.getValue()
                  return (
                    <div key={field.key} className="flex justify-between pl-2.5 leading-8">
                      <span className={value ? 'text-muted-foreground' : 'text-muted-foreground/50'}>{field.label}</span>
                      <span className={value ? 'font-medium' : 'text-muted-foreground/50'}>{value || '—'}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </CardContent>

        {/* CTA button — this is inside the <form> element in the DOM */}
        <div className="px-5 pb-5">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90 text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'edit' ? 'Uložit změny' : 'Vytvořit konfiguraci'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
