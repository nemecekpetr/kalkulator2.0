# Status Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace colored pill status buttons with a "status chip + mini timeline" pattern across all entity detail pages.

**Architecture:** Rewrite `StatusSteps` to render a timeline with connected dots and action buttons. Extract a new `StatusChip` component for page headers. Update all 4 wrapper components and 4 detail pages to use the new layout: chip in header (right side), timeline + actions below.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS v4, shadcn/ui, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-20-status-flow-redesign.md`

---

## Task 1: Rewrite `StatusSteps` + Add `StatusChip` + `getStatusStep`

The core component rewrite. All consumers still work after this because the old props interface is maintained (with one new optional prop `branchValues`).

**Files:**
- Modify: `src/components/admin/status-steps.tsx`

- [ ] **Step 1: Read the current file and understand exports**

Current exports: `StatusSteps`, `StatusColor`, `StatusStep`, `CONFIGURATION_STATUSES`, `QUOTE_STATUSES`, `ORDER_STATUSES`, `PRODUCTION_STATUSES`.

All must remain exported. We add: `StatusChip`, `getStatusStep`.

- [ ] **Step 2: Rewrite `status-steps.tsx`**

Replace the entire file with the new implementation:

```tsx
'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type StatusColor = 'gray' | 'blue' | 'yellow' | 'green' | 'red'

export interface StatusStep {
  value: string
  label: string
  color: StatusColor
}

// Color mappings for chip backgrounds and borders
const chipColors: Record<StatusColor, string> = {
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
}

const dotBgColors: Record<StatusColor, string> = {
  gray: 'bg-gray-400',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
}

// --- StatusChip ---

interface StatusChipProps {
  status: StatusStep
  showExpiredWarning?: boolean
}

export function StatusChip({ status, showExpiredWarning }: StatusChipProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold', chipColors[status.color])}>
        <div className={cn('w-2 h-2 rounded-full', dotBgColors[status.color])} />
        {status.label}
      </div>
      {showExpiredWarning && (
        <div className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">Vypršela platnost</span>
        </div>
      )}
    </div>
  )
}

// --- getStatusStep ---

export function getStatusStep(statuses: StatusStep[], value: string): StatusStep | undefined {
  return statuses.find(s => s.value === value)
}

// --- StatusSteps (timeline + action buttons) ---

interface StatusStepsProps {
  statuses: StatusStep[]
  branchValues?: string[]
  currentStatus: string
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
  showExpiredWarning?: boolean
}

export function StatusSteps({
  statuses,
  branchValues = [],
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusStepsProps) {
  const mainStatuses = statuses.filter(s => !branchValues.includes(s.value))
  const branchStatuses = statuses.filter(s => branchValues.includes(s.value))

  // Find the current status index in main flow
  const currentMainIndex = mainStatuses.findIndex(s => s.value === currentStatus)
  const isBranchActive = branchValues.includes(currentStatus)

  // For branch active: find which main step was the branch point
  // (the last completed main step before branching)
  const branchPointIndex = isBranchActive
    ? Math.max(0, mainStatuses.findIndex(s => {
        const statusIndex = statuses.findIndex(st => st.value === s.value)
        const currentStatusIndex = statuses.findIndex(st => st.value === currentStatus)
        return statusIndex >= currentStatusIndex
      }) - 1)
    : -1

  const getEffectiveIndex = () => {
    if (isBranchActive) return branchPointIndex
    return currentMainIndex
  }
  const effectiveIndex = getEffectiveIndex()

  const handleDotClick = (status: StatusStep) => {
    if (disabled || !onStatusChange || status.value === currentStatus) return
    onStatusChange(status.value)
  }

  // Determine next forward action (first main status after current)
  const nextMainStatus = !isBranchActive && currentMainIndex >= 0 && currentMainIndex < mainStatuses.length - 1
    ? mainStatuses[currentMainIndex + 1]
    : null

  const isInteractive = !disabled && !!onStatusChange

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="overflow-x-auto">
        <div className="flex items-start min-w-0">
          {mainStatuses.map((status, index) => {
            const isCompleted = index < effectiveIndex
            const isCurrent = index === effectiveIndex
            const isFuture = index > effectiveIndex
            const isBranchPoint = isBranchActive && index === branchPointIndex

            // Dot color
            let dotClass = 'bg-[#e2e8f0] text-muted-foreground' // future
            if (isCompleted) dotClass = 'bg-[#48A9A6] text-white'
            if (isCurrent && !isBranchActive) dotClass = cn(dotBgColors[status.color], 'text-white')
            if (isBranchPoint) dotClass = 'bg-red-500 text-white'

            // Line color
            const lineCompleted = index < effectiveIndex
            const lineClass = lineCompleted ? 'bg-[#48A9A6]' : 'bg-[#e2e8f0]'

            // Label color
            let labelClass = 'text-muted-foreground/50' // future
            if (isCompleted) labelClass = 'text-[#48A9A6]'
            if (isCurrent) labelClass = 'text-foreground font-semibold'
            if (isBranchPoint) labelClass = 'text-red-500 font-semibold'

            const isClickable = isInteractive && status.value !== currentStatus

            return (
              <div key={status.value} className="flex items-start flex-1 min-w-0" style={{ maxWidth: index === mainStatuses.length - 1 ? 'fit-content' : undefined }}>
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <button
                    type="button"
                    onClick={() => handleDotClick(status)}
                    disabled={!isClickable}
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors',
                      dotClass,
                      isClickable && 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-[#48A9A6]/30',
                      !isClickable && 'cursor-default'
                    )}
                  >
                    {isCompleted || isCurrent ? <Check className="w-3 h-3" /> : index + 1}
                  </button>
                  {/* Label */}
                  <span className={cn('text-[11px] mt-1.5 whitespace-nowrap', labelClass)}>
                    {status.label}
                  </span>
                </div>
                {/* Connecting line */}
                {index < mainStatuses.length - 1 && (
                  <div className={cn('h-[2px] flex-1 mt-2.5 mx-1', lineClass)} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      {isInteractive && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Next forward action */}
          {nextMainStatus && (
            <Button
              type="button"
              size="sm"
              onClick={() => onStatusChange(nextMainStatus.value)}
              disabled={disabled}
              className="bg-gradient-to-r from-[#FF8621] to-[#ED6663] hover:from-[#FF8621]/90 hover:to-[#ED6663]/90 text-white font-semibold"
            >
              {disabled && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {nextMainStatus.label}
            </Button>
          )}
          {/* Branch actions (e.g., Odmítnout, Zrušit) */}
          {!isBranchActive && branchStatuses.map(branch => (
            <Button
              key={branch.value}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(branch.value)}
              disabled={disabled}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              {branch.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Predefined status configurations ---

export const CONFIGURATION_STATUSES: StatusStep[] = [
  { value: 'new', label: 'Nová', color: 'blue' },
  { value: 'processed', label: 'Zpracovaná', color: 'green' },
]

export const QUOTE_STATUSES: StatusStep[] = [
  { value: 'draft', label: 'Koncept', color: 'gray' },
  { value: 'sent', label: 'Odesláno', color: 'blue' },
  { value: 'accepted', label: 'Akceptováno', color: 'green' },
  { value: 'rejected', label: 'Odmítnuto', color: 'red' },
]

export const ORDER_STATUSES: StatusStep[] = [
  { value: 'created', label: 'Nová', color: 'gray' },
  { value: 'sent', label: 'Odeslaná', color: 'blue' },
  { value: 'in_production', label: 'Předána do výroby', color: 'yellow' },
]

export const PRODUCTION_STATUSES: StatusStep[] = [
  { value: 'pending', label: 'Čeká', color: 'gray' },
  { value: 'in_progress', label: 'Ve výrobě', color: 'yellow' },
  { value: 'completed', label: 'Hotovo', color: 'green' },
  { value: 'cancelled', label: 'Zrušeno', color: 'red' },
]
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build passes (existing consumers still use old compatible interface — `branchValues` is optional and defaults to `[]`)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/status-steps.tsx
git commit -m "feat(status): rewrite StatusSteps to chip + mini timeline pattern"
```

---

## Task 2: Update Wrapper Components

Update all 4 wrapper components to use the new `StatusSteps` with `branchValues` and remove the inline `Loader2` (now handled by action buttons).

**Files:**
- Modify: `src/components/admin/quote-status-badge.tsx`
- Modify: `src/components/admin/order-status-badge.tsx`
- Modify: `src/components/admin/production-status-badge.tsx`
- Modify: `src/components/admin/configuration-status-badge.tsx`

- [ ] **Step 1: Update `quote-status-badge.tsx`**

Key changes:
- Add `branchValues={['rejected']}` to `StatusSteps`
- Remove the wrapping `<div className="flex items-center gap-3">` and `Loader2` (StatusSteps handles loading via `disabled`)
- Keep the "Vytvořit objednávku" button and variant dialog below the StatusSteps
- Keep existing order link

Replace the return JSX (lines 107-174):

```tsx
  return (
    <>
      <StatusSteps
        statuses={QUOTE_STATUSES}
        branchValues={['rejected']}
        currentStatus={status}
        onStatusChange={updateStatus}
        disabled={isUpdating}
        showExpiredWarning={isExpired}
      />
      {/* Show existing order link or create button when status is accepted */}
      {status === 'accepted' && showCreateOrderButton && (
        <div className="mt-3">
          {existingOrder ? (
            <Link
              href={`/admin/objednavky/${existingOrder.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100 transition-all"
            >
              {existingOrder.order_number}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConvertDialog(true)}
              disabled={isUpdating}
              className="border-purple-300 text-purple-600 hover:border-purple-400 hover:bg-purple-50"
            >
              Vytvořit objednávku
            </Button>
          )}
        </div>
      )}

      {/* Variant selection dialog — unchanged */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        {/* ... existing dialog content stays exactly as-is ... */}
      </AlertDialog>
    </>
  )
```

Add `Button` import: `import { Button } from '@/components/ui/button'`
Remove unused `Loader2` from lucide import (it's no longer used here).

- [ ] **Step 2: Update `order-status-badge.tsx`**

Replace the entire return JSX (lines 44-54):

```tsx
  return (
    <StatusSteps
      statuses={ORDER_STATUSES}
      currentStatus={status}
      onStatusChange={updateStatus}
      disabled={isUpdating}
    />
  )
```

Remove `Loader2` from imports (no longer used).

- [ ] **Step 3: Update `production-status-badge.tsx`**

Replace the entire return JSX (lines 45-55):

```tsx
  return (
    <StatusSteps
      statuses={PRODUCTION_STATUSES}
      branchValues={['cancelled']}
      currentStatus={currentStatus}
      onStatusChange={handleStatusChange}
      disabled={isUpdating}
    />
  )
```

Remove `Loader2` from imports (no longer used).

- [ ] **Step 4: Update `configuration-status-badge.tsx`**

Replace entire file — configurations use chip only, no timeline:

```tsx
'use client'

import type { ConfigurationStatus } from '@/lib/supabase/types'
import { StatusChip, CONFIGURATION_STATUSES, getStatusStep } from './status-steps'

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatus
}

export function ConfigurationStatusBadge({ status }: ConfigurationStatusBadgeProps) {
  const step = getStatusStep(CONFIGURATION_STATUSES, status)
  if (!step) return null
  return <StatusChip status={step} />
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/quote-status-badge.tsx src/components/admin/order-status-badge.tsx src/components/admin/production-status-badge.tsx src/components/admin/configuration-status-badge.tsx
git commit -m "feat(status): update wrapper components for timeline pattern"
```

---

## Task 3: Update Detail Pages — Header Layout

Move the status display from inline with `<h1>` to a separate header row: title/date left, `StatusChip` right. The wrapper component (timeline + actions) moves below the header.

**Files:**
- Modify: `src/app/(admin)/admin/nabidky/[id]/page.tsx`
- Modify: `src/app/(admin)/admin/objednavky/[id]/page.tsx`
- Modify: `src/app/(admin)/admin/vyroba/[id]/page.tsx`
- Modify: `src/app/(admin)/admin/konfigurace/[id]/page.tsx`

- [ ] **Step 1: Update quote detail page (`nabidky`)**

Add imports:
```tsx
import { StatusChip, getStatusStep, QUOTE_STATUSES } from '@/components/admin/status-steps'
```

Replace the header section (around lines 178-198). Current:
```tsx
<div className="flex items-center gap-3">
  <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
  <QuoteStatusBadge ... />
</div>
```

New structure:
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    <Button variant="ghost" size="icon" asChild>
      <Link href="/admin/nabidky">
        <ArrowLeft className="w-4 h-4" />
      </Link>
    </Button>
    <div>
      <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
      <p className="text-muted-foreground">
        Vytvořeno {format(new Date(quote.created_at), 'd. MMMM yyyy', { locale: cs })}
      </p>
    </div>
  </div>
  {(() => {
    const step = getStatusStep(QUOTE_STATUSES, (quote.status as string) || 'draft')
    const isExpired = !!(quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status === 'sent')
    return step ? <StatusChip status={step} showExpiredWarning={isExpired} /> : null
  })()}
</div>

{/* Status timeline + actions */}
<div className="mt-4">
  <QuoteStatusBadge
    quoteId={quote.id}
    status={(quote.status as QuoteStatus) || 'draft'}
    validUntil={quote.valid_until}
    existingOrder={quote.existingOrder}
    variants={quote.variants}
  />
</div>
```

Note: The `QuoteStatusBadge` now renders just the timeline + action buttons (no chip), so it goes below. The `StatusChip` in the header is the visual status indicator.

- [ ] **Step 2: Update order detail page (`objednavky`)**

Add imports:
```tsx
import { StatusChip, getStatusStep, ORDER_STATUSES } from '@/components/admin/status-steps'
```

Same pattern as quotes. Replace header (around lines 144-165):
- Remove `<OrderStatusBadge>` from the `<h1>` row
- Add `StatusChip` on the right side of header
- Add `<OrderStatusBadge>` in a `<div className="mt-4">` below

- [ ] **Step 3: Update production detail page (`vyroba`)**

Add imports:
```tsx
import { StatusChip, getStatusStep, PRODUCTION_STATUSES } from '@/components/admin/status-steps'
```

Same pattern. Replace header (around lines 133-153):
- Remove `<ProductionStatusBadge>` from the `<h1>` row
- Add `StatusChip` on the right side
- Add `<ProductionStatusBadge>` below in `<div className="mt-4">`

- [ ] **Step 4: Update configuration detail page (`konfigurace`)**

The `ConfigurationStatusBadge` now returns a `StatusChip` directly, so the header layout is already correct — it renders inline with `<h1>`. No timeline needed. Just verify it looks right (chip style instead of old pills).

No code changes needed if the current inline placement works visually. If the chip should move to the right side (matching other pages), apply the same pattern: move `<ConfigurationStatusBadge>` to the right side of the header flex.

- [ ] **Step 5: Verify build and lint**

Run: `npm run build && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(admin\)/admin/nabidky/\[id\]/page.tsx src/app/\(admin\)/admin/objednavky/\[id\]/page.tsx src/app/\(admin\)/admin/vyroba/\[id\]/page.tsx src/app/\(admin\)/admin/konfigurace/\[id\]/page.tsx
git commit -m "feat(status): move StatusChip to header, timeline below"
```

---

## Task 4: Visual Testing & Polish

- [ ] **Step 1: Test quote detail page**

Open: `http://localhost:3000/admin/nabidky/{id}`

Verify:
- Status chip appears in header (right side) with correct color
- Mini timeline renders below with dots and connecting lines
- Clicking dots changes status (forward and backward)
- Action buttons: gradient for next step, red outline for "Odmítnout"
- "Vytvořit objednávku" button visible when status is "accepted"
- Expired warning shows for quotes past valid_until

- [ ] **Step 2: Test order detail page**

Open: `http://localhost:3000/admin/objednavky/{id}`

Verify:
- Same layout pattern
- No branch buttons (orders have no cancellation)
- 3-dot timeline works

- [ ] **Step 3: Test production detail page**

Open: `http://localhost:3000/admin/vyroba/{id}`

Verify:
- "Zrušit" appears as red outline button
- Timeline shows 3 main dots (Čeká, Ve výrobě, Hotovo)
- Branch state (cancelled) shows red dot at branch point

- [ ] **Step 4: Test configuration detail page**

Open: `http://localhost:3000/admin/konfigurace/{id}`

Verify:
- Only chip visible, no timeline (read-only)

- [ ] **Step 5: Test responsive behavior**

- Resize to narrow width
- Timeline should scroll horizontally if needed
- Action buttons should wrap

- [ ] **Step 6: Final commit if any polish needed**

```bash
git add -u
git commit -m "fix(status): polish status flow timeline"
```
