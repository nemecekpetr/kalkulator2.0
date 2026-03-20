# Configuration Edit Page — Layout Redesign

## Summary

Redesign the admin configuration edit form (`ConfigurationForm`) from a single-card layout to a two-column layout with a sticky summary sidebar and completeness indicator. Additionally, add "Jiné" (Other) option to water treatment select with an optional text field.

## Current State

- File: `src/components/admin/configuration-form.tsx` (~622 lines)
- All pool configuration fields are in one `<Card>` with inconsistent grid layouts
- Water treatment options: `chlorine`, `salt` only (defined in `src/lib/constants/configurator.ts`)
- Validation: `WaterTreatmentEnum = z.enum(['chlorine', 'salt'])` in `src/lib/validations/configuration.ts`

## Design

### Layout: Two-Column with Sticky Summary

**Left column** — form split into 5 cards:

1. **Kontaktní údaje** — name, email, phone, message, (create-only: send email checkbox)
2. **Základní parametry** — pool shape (2-col), pool type (2-col), dimensions (3-col: length/width/depth or diameter/depth for circle)
3. **Vzhled** — color (2-col), stairs (2-col)
4. **Technologie & Příslušenství** — technology (full-width), lighting + counterflow (2-col), water treatment (full-width, with conditional "other" text field)
5. **Komfort** — heating (2-col), roofing (2-col)

Each pool card (2–5) has a section status indicator:
- `●` green (#48A9A6) — all required fields in section are filled
- `○` grey (#94a3b8) + "— nevyplněno" label — at least one required field is empty

**Right column** — sticky sidebar (`position: sticky; top: 20px`):

- Header with dark background (#01384B): title "Shrnutí konfigurace" + progress bar (% of required fields filled)
- Summary rows grouped by section, each section with ✓/○ status
- Each row: label (grey) left, value (bold) right, "—" for empty
- Dimensions shown as combined string: "6.0 × 3.0 × 1.5 m"
- Bottom: "Uložit změny" button with brand gradient (#FF8621 → #ED6663)
- Sidebar should have `max-height: calc(100vh - 40px); overflow-y: auto` to handle overflow

**Buttons:**
- "Zrušit" button stays at the bottom of the form (left column), NOT in the sidebar
- "Uložit změny" is duplicated: in sidebar (desktop) and at bottom of form (always visible)

**Responsive behavior:**
- Below ~1024px (`lg` breakpoint): sidebar hidden, single-column layout
- Submit button remains at bottom of form on mobile

### Typography (font sizes)

- Page title: text-xl (20px) or larger
- Card titles: text-base (16px), font-semibold
- Field labels: text-sm (14px), font-medium
- Input values: text-sm (14px)
- Sidebar section headers: text-xs (12px), uppercase, tracking-wide
- Sidebar rows: text-sm (13-14px)
- CTA button: text-base (15-16px), font-semibold

### Water Treatment: "Jiné" Option

**Constants** (`src/lib/constants/configurator.ts`):
- Add `{ id: 'other', label: 'Jiné', description: 'Vlastní typ úpravy vody' }` to `WATER_TREATMENT_OPTIONS`
- Update `getWaterTreatmentLabel` to support appending custom text: when `id === 'other'` and custom text is provided, return `"Jiné (custom text)"`

**Validation** (`src/lib/validations/configuration.ts`):
- Create a separate `AdminWaterTreatmentEnum = z.enum(['chlorine', 'salt', 'other'])` for admin forms
- Keep existing `WaterTreatmentEnum` unchanged for public configurator (public users must NOT be able to submit `'other'`)
- Add `water_treatment_other: z.string().nullable().optional()` to `ConfigurationInsertSchema`

**Form schema** (`configuration-form.tsx`):
- Add `water_treatment_other: z.string().optional()` field
- Default value: `configuration?.water_treatment_other || ''`

**UI behavior:**
- When `water_treatment === 'other'`: show text input below the select
- Placeholder: "Např. UV lampa, bezchlorová..."
- Field is optional (not required)
- Visual highlight: select gets teal border (#48A9A6) + light teal background (#f0fdfa) when "Jiné" selected
- When switching from "Jiné" to another option: clear `water_treatment_other` to `''`

**Database:**
- New column `water_treatment_other` (text, nullable) on `configurations` table
- Migration needed

**Data flow:**
- `water_treatment_other` value saved alongside `water_treatment: 'other'`
- Value appears in sidebar summary next to "Úprava vody" when filled
- Value passed through to quote generation (informational only, no product mapping for "other")

### Completeness Calculation

Progress percentage = (filled required pool fields / total required pool fields) × 100

Required pool fields vary by shape:
- **Rectangle** (11 fields): pool_shape, pool_type, length, width, depth, color, stairs, technology, lighting, counterflow, water_treatment, heating, roofing — **13 fields**
- **Circle** (10 fields): pool_shape, pool_type, diameter, depth, color, stairs, technology, lighting, counterflow, water_treatment, heating, roofing — **12 fields**

Contact fields are NOT included in the progress indicator.

### Files to Modify

1. `src/components/admin/configuration-form.tsx` — main layout restructure + sidebar component + water_treatment_other field
2. `src/lib/constants/configurator.ts` — add "Jiné" to WATER_TREATMENT_OPTIONS, update `getWaterTreatmentLabel`
3. `src/lib/validations/configuration.ts` — add `AdminWaterTreatmentEnum`, add `water_treatment_other` to `ConfigurationInsertSchema`
4. `supabase/migrations/XXXXXXXX_add_water_treatment_other.sql` — new column
5. `src/lib/supabase/types.ts` — add `water_treatment_other` to `Configuration` Row, Insert, and Update types in `Database` interface
6. `src/app/actions/admin-actions.ts` — explicitly add `water_treatment_other` to both `createConfiguration` and `updateConfiguration` data handling
7. `src/app/(admin)/admin/konfigurace/[id]/page.tsx` — display "Jiné (custom text)" in water treatment badge
8. `src/app/(admin)/admin/nabidky/[id]/page.tsx` — display "Jiné (custom text)" in quote detail water treatment label
9. `src/lib/email/templates/configuration-confirmation.ts` — handle `water_treatment: 'other'` with custom text in email

### Files NOT to Modify

- Public configurator wizard (`src/components/configurator/`) — "Jiné" is admin-only
- Public submission action (`src/app/actions/submit-configuration.ts`) — keeps original `WaterTreatmentEnum` without 'other'
- Quote generator (`src/lib/quote-generator.ts`) — "other" water treatment has no product mapping
- Pipedrive deals (`src/lib/pipedrive/deals.ts`) — water_treatment_other is passed via `generateDealNote` in admin-actions which uses `getWaterTreatmentLabel`, so updating that helper covers Pipedrive as well
