# Vrácení objednávky zpět k úpravě nabídky — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Když klient po odeslání objednávky k podpisu žádá o změnu, obchodník klikne na **„Vrátit k úpravě nabídky"** → současná objednávka se stornuje, obchodník je přesměrován na editaci nabídky (z níž objednávka vznikla), upraví ji a stávajícím tlačítkem **„Vytvořit objednávku"** vyrobí novou (s vyšším pořadovým číslem).

**Proč žádné verzování:** Klient ještě nepodepsal — neexistuje smluvní vazba na konkrétní podobu. Stornem se ničeho ztrácíme: stornovaná objednávka zůstává v DB pro audit (status `cancelled`), stejně tak její PDF. Nová objednávka je samostatný záznam s novým číslem (`OBJ-XX-YYMM`).

**Workflow z pohledu obchodníka:**
1. Klient řekne *„přidejte ohřev"* k objednávce `OBJ-01-0526`.
2. Obchodník v detailu objednávky `/admin/objednavky/<id>` klikne **„Vrátit k úpravě nabídky"** → potvrzovací dialog.
3. Po potvrzení:
   - Objednávka přejde do stavu `cancelled` (zůstává v seznamu jako *„Zrušeno"*).
   - Obchodník je automaticky přesměrován na **`/admin/nabidky/<quote_id>/upravit`**.
4. Obchodník upraví nabídku v existujícím editoru (přidá ohřev, změní cenu…).
5. Po uložení se vrátí na detail nabídky a klikne **„Vytvořit objednávku"** (existující tlačítko z accepted nabídky).
6. Vznikne nová objednávka `OBJ-02-0526` s aktualizovanými položkami a vlastním PDF.

**Architecture (minimální změny):**
- Rozšířit `OrderStatus` enum o `cancelled` (label `'Zrušeno'` v `ORDER_STATUS_LABELS` už existuje).
- Aktualizovat CHECK constraint na `orders.status` v migraci.
- Server action / API endpoint `POST /api/admin/orders/[id]/cancel-and-return-to-quote` — patch status na `cancelled`, vrátí `quote_id` pro redirect.
- Tlačítko v `/admin/objednavky/[id]/page.tsx` viditelné ve stavech `created` a `sent` (po `in_production` už ne — bazén se vyrábí).
- Ověřit, že stávající *„Vytvořit objednávku z nabídky"* flow (`/api/admin/quotes/[id]/convert`) funguje i když nabídka má vazbu na již stornovanou objednávku (nezablokuje to).
- Status `cancelled` přidat do filtru a chipu v `orders-table.tsx` (vzor Status UI).
- Žádný snapshot, žádné verze, žádné PDF revizí — old order zůstává v DB tak, jak byla.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS v4.

**Out of scope:**
- Verzování (sjednoceno s plánem — viz „Proč žádné verzování" výše).
- Notifikace klienta o zrušení objednávky / nové objednávce — vždy manuální.
- Smluvní text v PDF („tato smlouva nahrazuje…") — bezpředmětné, smlouva nebyla podepsaná.

---

## Chunk 1: Databáze a typy

### Task 1: Databázová migrace

**Files:**
- Create: `supabase/migrations/20260526000001_order_cancelled_status.sql`

- [ ] **Step 1: Vytvořit migraci**

```sql
-- Rozšířit povolené hodnoty orders.status o 'cancelled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('created', 'sent', 'in_production', 'cancelled'));
```

**Pozn.:** Pokud `orders_status_check` neexistuje, `DROP ... IF EXISTS` ji ignoruje. Ověř před migrací aktuální constraint pomocí:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND contype = 'c';
```

- [ ] **Step 2: Aplikovat migraci**

Run: `npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526000001_order_cancelled_status.sql
git commit -m "feat(objednavky): povolit status cancelled pro stornované objednávky"
```

---

### Task 2: TypeScript typy

**Files:**
- Modify: `src/lib/supabase/types.ts:42` (OrderStatus), `:952` (ORDER_STATUS_LABELS)

- [ ] **Step 1: Rozšířit `OrderStatus`**

```typescript
export type OrderStatus = 'created' | 'sent' | 'in_production' | 'cancelled'
```

- [ ] **Step 2: Ověřit, že label `cancelled: 'Zrušeno'` v `ORDER_STATUS_LABELS` už existuje**

Pokud chybí, doplnit. (Z grep výstupu vím, že na řádku 962 už existuje.)

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: TS build prochází.

---

## Chunk 2: Server action

### Task 3: API endpoint „Vrátit k úpravě nabídky"

**Files:**
- Create: `src/app/api/admin/orders/[id]/cancel-and-return-to-quote/route.ts`

- [ ] **Step 1: Implementovat POST handler**

Schéma:

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import { validateCsrf } from '@/lib/csrf'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  const csrfError = await validateCsrf(request)
  if (csrfError) return csrfError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Načíst objednávku včetně quote_id
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, quote_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })
    }

    // Povolit jen ve stavech created a sent
    if (!['created', 'sent'].includes(order.status)) {
      return NextResponse.json(
        { error: `Objednávku ve stavu „${order.status}" nelze vrátit k úpravě` },
        { status: 400 }
      )
    }

    if (!order.quote_id) {
      return NextResponse.json(
        { error: 'Objednávka nemá vazbu na nabídku — nelze vrátit k úpravě' },
        { status: 400 }
      )
    }

    // Storno objednávky
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (updateError) {
      console.error('Cancel order failed:', updateError)
      return NextResponse.json({ error: 'Storno se nepodařilo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, quoteId: order.quote_id })
  } catch (error) {
    console.error('Error in cancel-and-return-to-quote:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify pomocí curl / Postman**

```bash
curl -X POST http://localhost:3000/api/admin/orders/<id>/cancel-and-return-to-quote \
  -H "Cookie: <auth>" -H "Origin: http://localhost:3000"
```

Expected: 200 OK s `{success: true, quoteId: '<uuid>'}`. Objednávka v DB má status `cancelled`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts src/app/api/admin/orders/\[id\]/cancel-and-return-to-quote/
git commit -m "feat(objednavky): API endpoint pro storno objednávky a návrat k nabídce"
```

---

## Chunk 3: UI tlačítko

### Task 4: Tlačítko v detailu objednávky

**Files:**
- Modify: `src/app/(admin)/admin/objednavky/[id]/page.tsx` — najít místo s ostatními akčními tlačítky (status změna, stáhnout PDF, …)

- [ ] **Step 1: Přidat client-side handler**

Buď do existující client komponenty (pokud detail page už nějakou má), nebo extrahovat samostatnou `<CancelAndReturnButton orderId={order.id} orderStatus={order.status} />`. Doporučená cesta: samostatná komponenta v `src/components/admin/cancel-and-return-button.tsx`.

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Undo2, Loader2 } from 'lucide-react'
import type { OrderStatus } from '@/lib/supabase/types'

interface Props {
  orderId: string
  orderStatus: OrderStatus
}

export function CancelAndReturnButton({ orderId, orderStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Skrýt tlačítko ve stavech, kde už návrat nedává smysl
  if (orderStatus !== 'created' && orderStatus !== 'sent') return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel-and-return-to-quote`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Storno se nepodařilo')
        return
      }
      toast.success('Objednávka stornována. Můžete upravit nabídku.')
      router.push(`/admin/nabidky/${data.quoteId}/upravit`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Undo2 className="mr-2 h-4 w-4" />
          )}
          Vrátit k úpravě nabídky
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vrátit objednávku k úpravě nabídky?</AlertDialogTitle>
          <AlertDialogDescription>
            Tato objednávka se stornuje (zůstane v seznamu jako „Zrušeno"). Budete přesměrováni
            na editaci nabídky, ze které vznikla. Po úpravě nabídky můžete stávajícím tlačítkem
            „Vytvořit objednávku" vytvořit novou objednávku s vyšším pořadovým číslem.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Pokračovat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Vložit tlačítko do detail page**

V `src/app/(admin)/admin/objednavky/[id]/page.tsx` mezi ostatními akcemi (kde je „Stáhnout PDF", změna statusu apod.):

```tsx
<CancelAndReturnButton orderId={order.id} orderStatus={order.status} />
```

- [ ] **Step 3: Verify**

V dev:
- Otevřít detail objednávky ve stavu `sent` → tlačítko je vidět
- Otevřít detail objednávky ve stavu `in_production` → tlačítko se nezobrazuje
- Kliknout, potvrdit → toast, redirect na `/admin/nabidky/<id>/upravit`, v seznamu objednávek je status „Zrušeno"

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/cancel-and-return-button.tsx "src/app/(admin)/admin/objednavky/[id]/page.tsx"
git commit -m "feat(objednavky): tlačítko Vrátit k úpravě nabídky"
```

---

## Chunk 4: Status UI — zobrazit „Zrušeno"

### Task 5: Doplnit `cancelled` do statusů v seznamu a filtrech

**Files:**
- Modify: `src/components/admin/orders-table.tsx` (STATUS_COLORS map)
- Modify: `src/components/admin/status-config.ts` (`ORDER_STATUSES` definice — pokud existuje)

- [ ] **Step 1: Barva chipu**

V `orders-table.tsx` najít `STATUS_COLORS: Record<OrderStatus, string>` a doplnit:

```typescript
cancelled: 'bg-gray-100 text-gray-600 line-through',
```

(Šedá s line-through trvale signalizuje storno, vizuálně odlišné od `created`/`sent`.)

- [ ] **Step 2: Status timeline (`status-config.ts`)**

Pokud existuje pole `ORDER_STATUSES` s definicemi pro `StatusSteps`, přidat `cancelled` jako **branch** status (`isBranch: true`) — neleží na hlavní lince `created → sent → in_production`, ale jako odbočka z `sent`. Barva: `gray`.

- [ ] **Step 3: Filtr v seznamu objednávek**

V `src/app/(admin)/admin/objednavky/page.tsx` (případně v komponentě filteru, pokud je extrahovaný) přidat `cancelled` do dropdownu „Stav". Defaultní filtr může být *„Aktivní"* (created/sent/in_production), uživatel si zobrazí stornované volbou.

**Pozn.:** Pokud teď filtr neexistuje, neimplementuj ho — stornované objednávky půjdou prostě vidět smíchané s ostatními, jen budou vizuálně odlišené. Filtr lze přidat jako followup.

- [ ] **Step 4: Verify**

V dev:
- Stornovaná objednávka má v seznamu šedý chip s line-through
- StatusSteps na detail page ukáže storno jako odbočku z `sent`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/orders-table.tsx src/components/admin/status-config.ts
git commit -m "feat(objednavky): zobrazit cancelled status (chip, timeline)"
```

---

## Chunk 5: Ověření „Vytvořit objednávku" z nabídky s existující stornovanou objednávkou

### Task 6: Audit existing convert flow

**Files:**
- Read-only: `src/app/api/admin/quotes/[id]/convert/route.ts`

- [ ] **Step 1: Zkontrolovat, že convert endpoint neblokuje, pokud nabídka má již stornovanou objednávku**

Pravděpodobně endpoint nekontroluje existenci `orders` na quote_id — vyrobí novou. Pokud ano (kontroluje), doplnit podmínku: blokovat jen pokud existuje **aktivní** objednávka (status !== cancelled).

```typescript
const { count: activeOrders } = await supabase
  .from('orders')
  .select('id', { count: 'exact', head: true })
  .eq('quote_id', id)
  .neq('status', 'cancelled')

if ((activeOrders || 0) > 0) {
  return new NextResponse('Nabídka už má aktivní objednávku', { status: 400 })
}
```

- [ ] **Step 2: Verify**

V dev:
- Nabídka má stornovanou objednávku
- Tlačítko „Vytvořit objednávku" v detailu nabídky pořád funguje → vznikne nová objednávka

- [ ] **Step 3: Commit (pokud došlo k úpravě)**

```bash
git add src/app/api/admin/quotes/\[id\]/convert/route.ts
git commit -m "feat(nabidky): povolit konverzi pokud existuje pouze stornovaná objednávka"
```

---

## Chunk 6: Changelog

### Task 7: Novinka pro uživatele

**Files:**
- Modify: `src/lib/changelog-data.ts`

- [ ] **Step 1: Přidat položku do verze 1.1.2 (patch bump — feature je malá)**

```typescript
{
  version: '1.1.2',
  date: '<release date>',
  changes: [
    {
      type: 'feature',
      scope: 'objednavky',
      description: 'Vrátit objednávku k úpravě nabídky',
      userDescription: 'Když klient po obdržení objednávky k podpisu žádá o změnu, můžete teď objednávku stornovat a vrátit se k editaci nabídky. V detailu objednávky (ve stavech Vytvořeno a Odeslána) je nové tlačítko „Vrátit k úpravě nabídky" — po potvrzení se objednávka označí jako „Zrušeno" (zůstává v seznamu pro historii) a budete přesměrováni na editaci nabídky. Po úpravách nabídky stávajícím tlačítkem „Vytvořit objednávku" vyrobíte novou objednávku s vyšším pořadovým číslem. Tlačítko není dostupné po předání do výroby — tam by změna ohrozila výrobu.'
    }
  ]
}
```

`CURRENT_VERSION = '1.1.2'`.

- [ ] **Step 2: Commit**

```bash
git add src/lib/changelog-data.ts
git commit -m "docs(changelog): verze 1.1.2 — vrátit objednávku k úpravě nabídky"
```

---

## Open questions / discussion

Vyřešené (uživatelův input):
- ✅ Verzování není potřeba — stornem se nic nepoškodí, smlouva nepodepsaná.
- ✅ PDF: vždy regenerace, žádné ukládání historie.
- ✅ Notifikace klienta: vždy manuální (mimo systém).
- ✅ Smluvní text: žádný — nepodepsaná smlouva.

**Ještě otevřené:**
- **Items v objednávkách** — verifikace, jak jsou uložené (samostatná `order_items` tabulka, nebo přes `quote_id` na join). Toto je důležité pro Task 6 (kontrolu aktivních objednávek), ale jen okrajově. **Sám si to ověř v `src/lib/supabase/types.ts` a `supabase/migrations/` před implementací** — v plánu zatím necháno jako kontext.
- **Filter „Aktivní"** v seznamu objednávek (default: skrýt stornované) vs. ukázat vše. Doporučuji default *„Aktivní"* — stornované jsou pro většinu use case šum. Pokud se rozhodneš jinak, uprav Task 5/Step 3.

---

## Estimated effort

- Chunk 1 (DB + typy): **~30 min**
- Chunk 2 (API endpoint): **~30 min**
- Chunk 3 (UI tlačítko + dialog): **~1 h**
- Chunk 4 (Status UI): **~30 min**
- Chunk 5 (Audit convert): **~15 min**
- Chunk 6 (Changelog): **~10 min**
- Testing + buffer: **~30 min**

**Total: ~3 h** v rámci jednoho odpoledne.

---

## Followups (po dokončení)

- **Default filter „Aktivní"** v seznamu objednávek (skrýt cancelled).
- **„Důvod storna"** jako textové pole při kliknutí na tlačítko (audit — proč klient žádal změnu). Sloupec `cancellation_reason` na orders.
- **Stornováno před → po stránka v PDF**: pokud bude potřeba mít srovnání, lze v budoucnu doplnit. Zatím není.
