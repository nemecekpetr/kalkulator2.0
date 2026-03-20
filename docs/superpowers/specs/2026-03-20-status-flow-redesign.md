# Status Flow Redesign — Chip + Mini Timeline

## Summary

Redesign the `StatusSteps` component from colored pill buttons to a "status chip + mini timeline" pattern. Apply across all 4 entities: quotes, orders, production, configurations.

## Current State

- File: `src/components/admin/status-steps.tsx` (~122 lines)
- Renders clickable pill buttons with ChevronRight separators
- Color-coded by status (gray, blue, yellow, green, red)
- Wraps on narrow screens, "Odmítnuto" breaks to second line
- Used by 4 wrapper components: `QuoteStatusBadge`, `OrderStatusBadge`, `ProductionStatusBadge`, `ConfigurationStatusBadge`
- Used on 4 detail pages: nabídky, objednávky, výroba, konfigurace

## Design

### Visual Structure

**Status chip** (displayed in page header, right side):
- Small badge with colored dot (8px) + status text
- Background tinted to match status color (e.g., `#eff6ff` for blue "Odesláno")
- Rounded corners (8px), subtle border matching status color
- Exported as `StatusChip` from `status-steps.tsx`
- Props: `status: StatusStep`, `showExpiredWarning?: boolean`

**Mini timeline** (below header, inside wrapper component):
- Row of circles (20px) connected by horizontal lines (2px)
- Completed steps: teal (#48A9A6) background, white ✓
- Current step: status-specific color, white ✓
- Future steps: gray (#e2e8f0), gray number
- Labels below each dot (10-11px, gray for future, colored for completed/current)
- All dots are clickable — forward and backward transitions allowed
- Cursor: pointer on non-current dots, default on current
- When `disabled={true}`: no pointer cursor, no click handlers

**Branch status visual state:**
- When status is a branch (e.g., "rejected" for quotes, "cancelled" for production):
  - Chip shows the branch status in its color (red)
  - Timeline dots reflect progress up to the branch point
  - Example: quote rejected from "Odesláno" → Koncept (teal ✓), Odesláno (red ✓, branch point), Akceptováno (gray, future)
  - The branch-point dot uses the branch color (red) instead of teal

**Action buttons** (below timeline):
- Show only the next possible forward transitions
- Positive action: brand gradient button (#FF8621 → #ED6663)
- Negative action (Odmítnout/Zrušit): outline red border
- These trigger the same `onStatusChange` callback as dot clicks
- No action buttons shown when `disabled={true}` or no `onStatusChange`

**Loading state:**
- When status is being updated: action button that was clicked shows `Loader2` spinner, all buttons disabled
- The `disabled` prop on `StatusSteps` handles this (wrapper components set it during API calls)

**Responsive behavior:**
- Timeline uses `overflow-x-auto` for very narrow screens
- Labels truncate with `text-ellipsis` if needed
- Action buttons stack vertically on small screens: `flex-wrap`

### Entity Status Flows

**Quotes** (4 states): Koncept → Odesláno → Akceptováno | Odmítnuto
- "Odmítnuto" is a branch, not a sequential step
- Timeline shows 3 dots (Koncept, Odesláno, Akceptováno)
- "Odmítnout" only appears as a red outline button, not as a timeline dot
- When status is "accepted": "Vytvořit objednávku" button rendered by `QuoteStatusBadge` below the action buttons row (existing logic preserved: variant selection dialog, existing order link)

**Orders** (3 states): Nová → Odeslaná → Předána do výroby
- Linear flow, 3 dots, no branch statuses
- No negative action buttons (no cancellation flow)

**Production** (4 states): Čeká → Ve výrobě → Hotovo | Zrušeno
- "Zrušeno" is a branch (like "Odmítnuto" for quotes)
- Timeline shows 3 dots (Čeká, Ve výrobě, Hotovo)
- "Zrušit" appears as a red outline button

**Configurations** (2 states): Nová → Zpracovaná
- Read-only — `ConfigurationStatusBadge` passes `disabled={true}`, no `onStatusChange`
- Only `StatusChip` in header, no timeline rendered (a 2-dot read-only timeline adds no value)

### Component Architecture

**`StatusSteps` (rewritten):**

```typescript
interface StatusStepsProps {
  statuses: StatusStep[]        // all statuses (unchanged from current)
  branchValues?: string[]       // values that are branches, not sequential (e.g., ['rejected'])
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
  showExpiredWarning?: boolean
}
```

The component internally filters `statuses` into:
- `mainStatuses` = statuses whose `value` is NOT in `branchValues` → rendered as timeline dots
- `branchStatuses` = statuses whose `value` IS in `branchValues` → rendered as red outline action buttons

Predefined constants remain unchanged: `QUOTE_STATUSES`, `ORDER_STATUSES`, `PRODUCTION_STATUSES`, `CONFIGURATION_STATUSES`.

**`StatusChip` (new, named export from `status-steps.tsx`):**

```typescript
interface StatusChipProps {
  status: StatusStep
  showExpiredWarning?: boolean
}
```

**Utility function (named export from `status-steps.tsx`):**

```typescript
export function getStatusStep(statuses: StatusStep[], value: string): StatusStep | undefined
```

Used by detail pages to look up the current step for `StatusChip`.

**Wrapper components** (QuoteStatusBadge, OrderStatusBadge, ProductionStatusBadge):
- Keep existing logic (API calls, router.refresh, toasts, loading state)
- Render: mini timeline + action buttons (via new `StatusSteps`)
- `QuoteStatusBadge` additionally renders "Vytvořit objednávku" button + variant dialog below the timeline when status is "accepted"
- `ConfigurationStatusBadge`: simplified to only export a `StatusChip` (no timeline needed)

**Detail pages** (nabídky, objednávky, výroba, konfigurace):
- Header layout: title/date left, `StatusChip` right
- Import `StatusChip`, `getStatusStep`, and the relevant statuses constant
- Below header: wrapper component (timeline + buttons), except configurations (chip only)

### Files to Modify

1. `src/components/admin/status-steps.tsx` — full rewrite: `StatusSteps` timeline + `StatusChip` + `getStatusStep`
2. `src/components/admin/quote-status-badge.tsx` — use new `StatusSteps` with `branchValues={['rejected']}`, keep order creation logic
3. `src/components/admin/order-status-badge.tsx` — use new `StatusSteps` (no branches)
4. `src/components/admin/production-status-badge.tsx` — use new `StatusSteps` with `branchValues={['cancelled']}`
5. `src/components/admin/configuration-status-badge.tsx` — simplify to chip-only (no timeline)
6. `src/app/(admin)/admin/nabidky/[id]/page.tsx` — header: title left, `StatusChip` right; body: `QuoteStatusBadge`
7. `src/app/(admin)/admin/objednavky/[id]/page.tsx` — same pattern
8. `src/app/(admin)/admin/vyroba/[id]/page.tsx` — same pattern
9. `src/app/(admin)/admin/konfigurace/[id]/page.tsx` — header: title left, `StatusChip` right; no timeline

### Files NOT to Modify

- Status type definitions in `types.ts`
- API routes for status transitions
- Bulk status operations
- Table/list views (they use their own inline badges, not StatusSteps)
- Variant selection dialog in `QuoteStatusBadge` (preserved as-is)
