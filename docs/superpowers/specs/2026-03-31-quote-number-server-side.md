# Quote Number: Server-Side Generation

**Date:** 2026-03-31
**Status:** Approved
**Root cause:** `quote_number` generated at page load, not at save — causes UNIQUE constraint violation when two tabs/users race

## Problem

`generateQuoteNumber()` runs in `nova/page.tsx` (server component) when the "New Quote" page loads. The number is passed as a prop and sent in the POST payload. If another quote is created between page load and save, the number collides (`23505` — duplicate key).

From Railway logs: 6 consecutive failures with `Key (quote_number)=(NAB-080326) already exists.`

## Solution: Approach A — Generate at Save Time

Move `generateQuoteNumber()` into the POST handler in `api/admin/quotes/route.ts`. The client sends the payload **without** `quote_number`. The server generates it atomically before INSERT.

## Changes

### 1. `src/app/api/admin/quotes/route.ts`
- Add `generateQuoteNumber()` function (move from `nova/page.tsx`)
- Make `quote_number` optional in `QuoteSchema` (POST only — PUT still receives it)
- In POST handler: generate number before INSERT
- Return `{ id, quote_number }` in success response
- Also deploy the existing local fix: include `detail` in 500 error responses

### 2. `src/app/(admin)/admin/nabidky/nova/page.tsx`
- Remove `generateQuoteNumber()` function
- Remove `quoteNumber` from `Promise.all`
- Don't pass `quoteNumber` prop to `QuoteEditor`

### 3. `src/components/admin/quote-editor.tsx`
- Make `quoteNumber` prop optional
- Header: show "Nova nabidka" when no `quoteNumber`
- `saveQuote()`: don't include `quote_number` in POST payload for new quotes (still include for PUT)
- After successful POST: use returned `quote_number` if needed (redirect uses `id`, so minimal impact)

## Out of Scope
- PUT route (edit) — already has a valid quote_number from the existing quote
- Quote number format change — stays `NAB-XXYYMM`
- Transaction wrapping (separate concern)
