# Configuration Edit Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin configuration edit form to a two-column layout with sticky summary sidebar, completeness indicator, and add "Jiné" water treatment option.

**Architecture:** Split the existing single-card `ConfigurationForm` into 5 logical cards (left column) with a sticky summary sidebar (right column). Add `water_treatment_other` as a new DB column and form field. The sidebar reactively displays form values and completion progress via `react-hook-form` `watch()`.

**Tech Stack:** Next.js 16 App Router, React Hook Form, Zod, Supabase, Tailwind CSS v4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-20-configuration-edit-layout-design.md`

---

## Task 1: Database Migration — `water_treatment_other` Column

**Files:**
- Create: `supabase/migrations/20260320000001_water_treatment_other.sql`
- Modify: `src/lib/supabase/types.ts:69-175`

- [ ] **Step 1: Create migration file**

```sql
-- Add optional water_treatment_other column for custom water treatment description
ALTER TABLE configurations ADD COLUMN water_treatment_other text;
```

- [ ] **Step 2: Update TypeScript types**

In `src/lib/supabase/types.ts`, add `water_treatment_other` to all three interfaces inside `Database.public.Tables.configurations`:

- `Row` (after line 89 `water_treatment: string`): `water_treatment_other: string | null`
- `Insert` (after line 127 `water_treatment?: string`): `water_treatment_other?: string | null`
- `Update` (after line 160 `water_treatment?: string`): `water_treatment_other?: string | null`

- [ ] **Step 3: Apply migration**

Run: `npx supabase db push`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260320000001_water_treatment_other.sql src/lib/supabase/types.ts
git commit -m "feat(db): add water_treatment_other column to configurations"
```

---

## Task 2: Constants & Validation — "Jiné" Water Treatment Option

**Files:**
- Modify: `src/lib/constants/configurator.ts:189-203,321-323`
- Modify: `src/lib/validations/configuration.ts:38-40,271`

- [ ] **Step 1: Add "Jiné" to WATER_TREATMENT_OPTIONS**

In `src/lib/constants/configurator.ts`, add after the `chlorine` entry (before `] as const` on line 203):

```typescript
  {
    id: 'other',
    label: 'Jiné',
    description: 'Vlastní typ úpravy vody',
  }
```

- [ ] **Step 2: Update `getWaterTreatmentLabel` to accept optional custom text**

Replace the function at lines 321-323:

```typescript
export function getWaterTreatmentLabel(treatmentId: string, otherText?: string | null) {
  if (treatmentId === 'other' && otherText) {
    return `Jiné (${otherText})`
  }
  return WATER_TREATMENT_OPTIONS.find(w => w.id === treatmentId)?.label ?? treatmentId
}
```

- [ ] **Step 3: Add `water_treatment_other` to `ConfigurationInsertSchema`**

In `src/lib/validations/configuration.ts`, at line 272 (after `water_treatment: WaterTreatmentEnum,`), add:

```typescript
  water_treatment_other: z.string().nullable().optional(),
```

Note: Do NOT modify `WaterTreatmentEnum` itself — the public configurator uses it and must not allow `'other'`. The admin form uses its own local `z.string()` validation, not this enum.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants/configurator.ts src/lib/validations/configuration.ts
git commit -m "feat(config): add 'Jiné' water treatment option"
```

---

## Task 3: Server Actions — Pass `water_treatment_other`

**Files:**
- Modify: `src/app/actions/admin-actions.ts:395-413,438-454`

- [ ] **Step 1: Add `water_treatment_other` to `updateConfiguration` data type**

At line 409 (after `water_treatment?: string`), add:

```typescript
    water_treatment_other?: string | null
```

The function passes `data` directly to `.update(data)` (line 420), so no additional mapping needed.

- [ ] **Step 2: Add `water_treatment_other` to `createConfiguration` data type**

At line 450 (after `water_treatment: string`), add:

```typescript
  water_treatment_other?: string | null
```

The function uses `...configData` spread (line 464), so the field will be included automatically.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/admin-actions.ts
git commit -m "feat(actions): support water_treatment_other in config CRUD"
```

---

## Task 4: Display Updates — Config Detail, Quote Detail, Quote Editor

**Files:**
- Modify: `src/app/(admin)/admin/konfigurace/[id]/page.tsx:297-300`
- Modify: `src/app/(admin)/admin/nabidky/[id]/page.tsx:64-76,629-633`
- Modify: `src/components/admin/quote-editor.tsx:1614-1627`

- [ ] **Step 1: Update config detail page**

In `src/app/(admin)/admin/konfigurace/[id]/page.tsx`, replace the water_treatment badge (lines 297-300):

```tsx
{config.water_treatment && (
  <Badge variant="secondary">
    {getWaterTreatmentLabel(config.water_treatment, config.water_treatment_other)}
  </Badge>
)}
```

`getWaterTreatmentLabel` is already imported from `@/lib/constants/configurator`.

- [ ] **Step 2: Add `waterTreatmentOther` to quote's `pool_config` mapping**

In `src/components/admin/quote-editor.tsx`, the `pool_config` JSON is built at lines 1614-1627. Add after line 1624 (`waterTreatment: configuration.water_treatment,`):

```typescript
              waterTreatmentOther: configuration.water_treatment_other,
```

- [ ] **Step 3: Add `waterTreatmentOther` to `PoolConfig` interface and update display**

In `src/app/(admin)/admin/nabidky/[id]/page.tsx`:

Add to the `PoolConfig` interface (after line 74 `waterTreatment?: string`):

```typescript
  waterTreatmentOther?: string | null
```

Update the water treatment display (lines 629-633):

```tsx
{config.waterTreatment && (
  <div className="flex justify-between">
    <span className="text-muted-foreground">Úprava vody</span>
    <span className="font-medium">{getWaterTreatmentLabel(config.waterTreatment, config.waterTreatmentOther)}</span>
  </div>
)}
```

- [ ] **Step 4: Update email template data mapping**

In `src/lib/email/templates/configuration-confirmation.ts`:

Add to `ConfigurationEmailData` interface (after line 35 `waterTreatment: string`):

```typescript
  waterTreatmentOther?: string | null
```

Update `configToEmailData` (after line 57 `waterTreatment: config.water_treatment,`):

```typescript
    waterTreatmentOther: config.water_treatment_other,
```

Note: The email HTML template does not currently render water treatment, so no HTML changes needed. The data is mapped for future use.

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(admin\)/admin/konfigurace/\[id\]/page.tsx src/app/\(admin\)/admin/nabidky/\[id\]/page.tsx src/components/admin/quote-editor.tsx src/lib/email/templates/configuration-confirmation.ts
git commit -m "feat(config): display water_treatment_other in detail pages and quote config"
```

---

## Task 5: Form Layout Redesign — Two-Column with Sidebar

This is the main task. The file `src/components/admin/configuration-form.tsx` (~622 lines) gets restructured.

**Files:**
- Create: `src/components/admin/configuration-summary.tsx`
- Modify: `src/components/admin/configuration-form.tsx`

- [ ] **Step 1: Add `water_treatment_other` to form schema and defaults**

Update import at line 1: `import { useState, useEffect } from 'react'`

Add to `formSchema` (after line 60 `water_treatment:`):

```typescript
  water_treatment_other: z.string().optional(),
```

Add to `defaultValues` (after line 95 `water_treatment:`):

```typescript
      water_treatment_other: configuration?.water_treatment_other || '',
```

Add watcher for water_treatment (after line 103 `const poolShape = form.watch('pool_shape')`):

```typescript
  const waterTreatment = form.watch('water_treatment')
```

- [ ] **Step 2: Add `water_treatment_other` to form submission**

In `onSubmit`, add to the `data` object (after line 133 `water_treatment:`):

```typescript
        water_treatment_other: values.water_treatment === 'other' ? (values.water_treatment_other || null) : null,
```

- [ ] **Step 3: Add clear effect for `water_treatment_other` when switching away from "Jiné"**

After the watchers (around line 105), add:

```typescript
  // Clear water_treatment_other when switching away from 'other'
  useEffect(() => {
    if (waterTreatment !== 'other' && form.getValues('water_treatment_other')) {
      form.setValue('water_treatment_other', '')
    }
  }, [waterTreatment, form])
```

- [ ] **Step 4: Create the `ConfigurationSummary` component**

Create `src/components/admin/configuration-summary.tsx`:

```tsx
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

// FormValues type matches the form schema in configuration-form.tsx
interface ConfigurationSummaryProps {
  form: UseFormReturn<{
    pool_shape: string
    pool_type: string
    diameter?: number
    length?: number
    width?: number
    depth: number
    color: string
    stairs: string
    technology: string
    lighting: string
    counterflow: string
    water_treatment: string
    water_treatment_other?: string
    heating: string
    roofing: string
    [key: string]: unknown
  }>
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
```

- [ ] **Step 5: Restructure the form layout in `configuration-form.tsx`**

Add import at top:

```typescript
import { ConfigurationSummary } from './configuration-summary'
```

Replace the return JSX (lines 165-621) with the two-column layout. The structure:

```tsx
return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column: Form cards */}
        <div className="space-y-4">

          {/* Card 1: Kontaktní údaje */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kontaktní údaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ... existing contact fields unchanged ... */}
            </CardContent>
          </Card>

          {/* Card 2: Základní parametry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className={isBasicComplete ? 'text-[#48A9A6]' : 'text-muted-foreground'}>
                  {isBasicComplete ? '●' : '○'}
                </span>
                Základní parametry
                {!isBasicComplete && <span className="text-sm text-muted-foreground font-normal">— nevyplněno</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* pool_shape + pool_type: 2-col grid */}
              {/* dimensions: 3-col grid (or 2-col for circle) */}
            </CardContent>
          </Card>

          {/* Card 3: Vzhled */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className={isAppearanceComplete ? 'text-[#48A9A6]' : 'text-muted-foreground'}>
                  {isAppearanceComplete ? '●' : '○'}
                </span>
                Vzhled
                {!isAppearanceComplete && <span className="text-sm text-muted-foreground font-normal">— nevyplněno</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* color + stairs: 2-col grid */}
            </CardContent>
          </Card>

          {/* Card 4: Technologie & Příslušenství */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className={isTechComplete ? 'text-[#48A9A6]' : 'text-muted-foreground'}>
                  {isTechComplete ? '●' : '○'}
                </span>
                Technologie & Příslušenství
                {!isTechComplete && <span className="text-sm text-muted-foreground font-normal">— nevyplněno</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* technology: full width */}
              {/* lighting + counterflow: 2-col grid */}
              {/* water_treatment: full width */}
              {/* Conditional: water_treatment_other text input */}
            </CardContent>
          </Card>

          {/* Card 5: Komfort */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className={isComfortComplete ? 'text-[#48A9A6]' : 'text-muted-foreground'}>
                  {isComfortComplete ? '●' : '○'}
                </span>
                Komfort
                {!isComfortComplete && <span className="text-sm text-muted-foreground font-normal">— nevyplněno</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* heating + roofing: 2-col grid */}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Sticky summary */}
        <ConfigurationSummary form={form} isSubmitting={isSubmitting} mode={mode} />
      </div>

      {/* Bottom buttons (always visible, including mobile) */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {mode === 'edit' ? 'Uložit změny' : 'Vytvořit konfiguraci'}
        </Button>
      </div>
    </form>
  </Form>
)
```

Section completeness helpers — add after watchers:

```tsx
const poolShape = form.watch('pool_shape')
const poolType = form.watch('pool_type')
const waterTreatment = form.watch('water_treatment')

// Section completeness helpers
const isBasicComplete = Boolean(
  poolShape && poolType &&
  (poolShape === 'circle' ? form.watch('diameter') : (form.watch('length') && form.watch('width'))) &&
  form.watch('depth')
)
const isAppearanceComplete = Boolean(form.watch('color') && form.watch('stairs'))
const isTechComplete = Boolean(form.watch('technology') && form.watch('lighting') && form.watch('counterflow') && waterTreatment)
const isComfortComplete = Boolean(form.watch('heating') && form.watch('roofing'))
```

Water treatment "Jiné" conditional field in Card 4:

```tsx
{/* Water treatment */}
<FormField
  control={form.control}
  name="water_treatment"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Úprava vody *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger className={waterTreatment === 'other' ? 'border-[#48A9A6] bg-[#f0fdfa]' : ''}>
            <SelectValue placeholder="Vyberte úpravu vody" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {WATER_TREATMENT_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
{waterTreatment === 'other' && (
  <FormField
    control={form.control}
    name="water_treatment_other"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-muted-foreground">Upřesnění (volitelné)</FormLabel>
        <FormControl>
          <Input placeholder="Např. UV lampa, bezchlorová..." {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

- [ ] **Step 6: Verify build and lint**

Run: `npm run build && npm run lint`

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/configuration-form.tsx src/components/admin/configuration-summary.tsx
git commit -m "feat(config): two-column layout with sticky summary sidebar"
```

---

## Task 6: Manual Testing & Polish

- [ ] **Step 1: Test the edit page**

Open: `http://localhost:3000/admin/konfigurace/{id}/upravit`

Verify:
- Two-column layout renders on desktop
- Sidebar shows correct values from form
- Progress bar updates as fields are filled
- Section indicators (●/○) update correctly
- "Jiné" option appears in water treatment select
- Optional text field appears/disappears when toggling "Jiné"
- Text field clears when switching away from "Jiné"
- Form submits correctly with all data including `water_treatment_other`

- [ ] **Step 2: Test responsive behavior**

- Resize below 1024px — sidebar should hide
- Form should be single-column
- Bottom buttons remain visible

- [ ] **Step 3: Test create page**

Open: `http://localhost:3000/admin/konfigurace/nova`

Verify: same layout works for create mode (with email checkbox visible).

- [ ] **Step 4: Test detail pages**

Verify water treatment "Jiné (custom text)" displays correctly on:
- `/admin/konfigurace/{id}` (config detail)
- `/admin/nabidky/{id}` (quote detail — create a quote from the config first, verify `pool_config` JSON includes `waterTreatmentOther`)

- [ ] **Step 5: Final commit if any polish needed**

```bash
git add -u
git commit -m "fix(config): polish configuration edit layout"
```
