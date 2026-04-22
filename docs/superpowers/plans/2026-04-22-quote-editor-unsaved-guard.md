# Quote Editor — Unsaved Changes Guard

**Status:** Backlog (not started)
**Created:** 2026-04-22
**Priority:** Medium — recurring UX friction, causes data loss

## Problem

Quote editor (`src/components/admin/quote-editor.tsx`) has no protection against accidental navigation away from unsaved work. Users lose in-progress quotes via:

- Back arrow in page header (`<Link>` — silent client-side redirect)
- Sidebar navigation clicks
- Browser back button
- Tab close / page reload

Same issue likely affects other editors (order editor, production, products) — solution should be reusable.

## Desired Behavior

When user attempts to leave the editor with unsaved changes, show confirmation dialog:

> **Máte neuložené změny**
> Pokud odejdete, o rozdělanou nabídku přijdete.
> [Zůstat na stránce] [Uložit a odejít] [Zahodit změny]

Guard should cover: internal navigation (Link clicks), browser back, tab close, page reload.

## Technical Notes

Next.js 16 App Router does **not** provide built-in navigation blocking (no `useBlocker` equivalent from React Router). Three viable approaches:

1. **Manual per-route** — Replace `<Link>` with `<Button>` + `AlertDialog` in known navigation points (header back arrow, sidebar). Add `beforeunload` listener for tab close. Does not cover browser back button reliably.

2. **`history.pushState` patch** — Monkey-patch browser history + `popstate` listener. Covers everything but fragile.

3. **Community library** — e.g. `next-navigation-guard`. One hook, handles all cases. Recommended.

## Scope

- Dirty tracking in quote editor (initial snapshot vs current state, or flag on first change)
- Confirmation dialog component (reusable across editors)
- `beforeunload` listener
- Navigation guard for internal links
- Apply to quote editor first, then consider order/production/product editors as follow-up

## Files to Touch

- `src/components/admin/quote-editor.tsx` — dirty state + guard hook
- `src/app/(admin)/admin/nabidky/nova/page.tsx` — back button
- `src/app/(admin)/admin/nabidky/[id]/upravit/page.tsx` — back button
- New: `src/hooks/use-unsaved-guard.ts` — reusable hook
- New: `src/components/admin/unsaved-changes-dialog.tsx` — reusable dialog

## Estimate

- `beforeunload` + dirty tracking: ~1h
- Internal navigation guard (manual approach): ~2h
- Full solution with reusable hook + testing: ~3–4h

## Open Questions

- Keep navigation blocking library as dependency, or implement manually?
- Should "Save and leave" button in dialog be allowed to fail silently, or block navigation until save succeeds?
- Apply same guard to other editors now or as separate follow-up?

## Related

- Original analysis: conversation 2026-04-22 (quote editor bugs)
- Accompanying fix (already merged): disabled checkbox when last variant remains
