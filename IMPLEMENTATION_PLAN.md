# Implementační plán - Bezpečnostní opravy

**Projekt:** Rentmil Konfigurátor
**Datum:** 27. prosince 2025
**Reference:** CODE_REVIEW_2025-12-27.md

---

## Přehled fází

| Fáze | Název | Priorita | Odhad | Status |
|:----:|-------|:--------:|:-----:|:------:|
| 1 | Kritické opravy | P0 | 4-5h | ⬜ |
| 2 | Vysoká rizika | P1 | 11-12h | ⬜ |
| 3 | Střední rizika | P2 | 16h | ⬜ |
| 4 | Architektura | P3 | 18h | ⬜ |

---

## Fáze 1: Kritické opravy (IHNED)

### 1.1 Vytvořit auth helper funkce

**Soubor:** `src/lib/auth/api-auth.ts` (nový)

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type AuthResult =
  | { error: NextResponse }
  | { user: User; supabase: SupabaseClient }

export type AdminResult =
  | { error: NextResponse }
  | { user: User; profile: { role: string }; supabase: SupabaseClient }

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { user, supabase }
}

export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
  }

  return { user, profile, supabase }
}

export function isAuthError(result: AuthResult | AdminResult): result is { error: NextResponse } {
  return 'error' in result
}
```

**Checklist:**
- [ ] Vytvořit soubor
- [ ] Přidat typy
- [ ] Exportovat z `src/lib/auth/index.ts`

---

### 1.2 Přidat auth do admin API routes

**Vzor pro každý endpoint:**

```typescript
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  const { supabase } = auth
  // ... zbytek kódu
}
```

**Soubory k úpravě:**

| Soubor | Metody | Status |
|--------|--------|:------:|
| `src/app/api/admin/quotes/[id]/status/route.ts` | PATCH | ⬜ |
| `src/app/api/admin/quotes/[id]/convert/route.ts` | POST | ⬜ |
| `src/app/api/admin/quotes/[id]/pdf/route.ts` | GET | ⬜ |
| `src/app/api/admin/production/route.ts` | GET, POST | ⬜ |
| `src/app/api/admin/production/[id]/route.ts` | GET, PATCH, DELETE | ⬜ |
| `src/app/api/admin/production/[id]/items/route.ts` | PATCH, POST, DELETE | ⬜ |
| `src/app/api/admin/orders/[id]/route.ts` | GET, PATCH, DELETE | ⬜ |
| `src/app/api/admin/products/bulk-delete/route.ts` | POST | ⬜ |
| `src/app/api/admin/export/route.ts` | GET | ⬜ |
| `src/app/api/admin/quotes/generate-items/route.ts` | POST | ⬜ |

---

### 1.3 Turnstile fail-closed

**Soubor:** `src/lib/turnstile.ts`

**Před:**
```typescript
if (!TURNSTILE_SECRET_KEY) {
  console.warn('Turnstile secret key not configured')
  return true  // ❌ Bypass
}
```

**Po:**
```typescript
if (!TURNSTILE_SECRET_KEY) {
  console.error('CRITICAL: TURNSTILE_SECRET_KEY not configured')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Turnstile verification unavailable')
  }
  // V development povolíme pro testování
  console.warn('DEV MODE: Skipping Turnstile verification')
  return true
}
```

**Checklist:**
- [ ] Upravit podmínku
- [ ] Přidat production check
- [ ] Otestovat v dev i prod

---

### 1.4 Rate limit fail-closed

**Soubor:** `src/lib/rate-limit.ts`

**Před:**
```typescript
if (!ratelimit) {
  return { success: true, remaining: 999, reset: 0 }
}
// ...
catch (error) {
  return { success: true, remaining: 999, reset: 0 }
}
```

**Po:**
```typescript
if (!ratelimit) {
  console.error('CRITICAL: Rate limiting not configured')
  if (process.env.NODE_ENV === 'production') {
    // V produkci fail-closed - odmítni request
    return { success: false, remaining: 0, reset: Date.now() + 60000 }
  }
  // V development povolíme
  return { success: true, remaining: 999, reset: 0 }
}
// ...
catch (error) {
  console.error('Rate limit check error:', error)
  if (process.env.NODE_ENV === 'production') {
    // V produkci při chybě odmítni (fail-closed)
    return { success: false, remaining: 0, reset: Date.now() + 60000 }
  }
  return { success: true, remaining: 999, reset: 0 }
}
```

---

### 1.5 Webhook HMAC validation

**Soubor:** `src/app/api/webhook/pipedrive-callback/route.ts`

**Před:**
```typescript
if (process.env.MAKE_CALLBACK_SECRET && payload.secret !== process.env.MAKE_CALLBACK_SECRET) {
  return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
}
```

**Po:**
```typescript
const MAKE_CALLBACK_SECRET = process.env.MAKE_CALLBACK_SECRET

if (!MAKE_CALLBACK_SECRET) {
  console.error('CRITICAL: MAKE_CALLBACK_SECRET not configured')
  return NextResponse.json(
    { error: 'Webhook not configured' },
    { status: 503 }
  )
}

if (payload.secret !== MAKE_CALLBACK_SECRET) {
  console.warn('Invalid webhook secret attempt', {
    ip: request.headers.get('x-forwarded-for'),
    configurationId: payload.configurationId
  })
  return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
}
```

---

### 1.6 Fix technology type mismatch

**Problém:** `technology` je definováno jako string i jako array.

**Krok 1: Aktualizovat types.ts**
```typescript
// src/lib/supabase/types.ts
export interface Configuration {
  // ...
  technology: string[] | null  // Explicitně array nebo null
}
```

**Krok 2: Aktualizovat validations**
```typescript
// src/lib/validations/configuration.ts
technology: z.array(TechnologyEnum).optional().default([])
```

**Krok 3: Opravit renderování**
```typescript
// src/app/(admin)/admin/konfigurace/[id]/page.tsx
{Array.isArray(config.technology) && config.technology.length > 0 ? (
  config.technology.map((tech: string) => (
    <Badge key={tech} variant="secondary">
      {getTechnologyLabel(tech)}
    </Badge>
  ))
) : (
  <span className="text-muted-foreground">-</span>
)}
```

**Checklist:**
- [ ] Aktualizovat types.ts
- [ ] Aktualizovat validations/configuration.ts
- [ ] Opravit konfigurace/[id]/page.tsx
- [ ] Zkontrolovat quote-generator.ts
- [ ] Zkontrolovat quote-editor.tsx
- [ ] Otestovat existující data

---

## Fáze 2: Vysoká rizika

### 2.1 Fix N+1 Query v quotes

**Soubor:** `src/app/api/admin/quotes/route.ts`

**Řešení:** Jeden JOIN místo loop queries

```typescript
// Místo:
for (const quote of quotes) {
  const { data: itemVariants } = await supabase
    .from('quote_item_variants')
    .select('*')
    .in('quote_item_id', quote.items.map(i => i.id))
}

// Použít:
const allItemIds = quotes.flatMap(q => q.items.map(i => i.id))
const { data: allVariants } = await supabase
  .from('quote_item_variants')
  .select('*')
  .in('quote_item_id', allItemIds)

// Pak přiřadit k quotes
const variantsByItemId = groupBy(allVariants, 'quote_item_id')
```

---

### 2.2 Transakce pro Quote→Order konverzi

**Soubor:** `src/app/api/admin/quotes/[id]/convert/route.ts`

**Řešení:** Použít Supabase RPC s transakcí

```sql
-- Nová migrace: create_order_from_quote.sql
CREATE OR REPLACE FUNCTION create_order_from_quote(
  p_quote_id UUID,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
BEGIN
  -- Generovat order number
  SELECT 'OBJ-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO v_order_number
  FROM orders
  WHERE created_at >= DATE_TRUNC('year', NOW());

  -- Vytvořit objednávku
  INSERT INTO orders (quote_id, order_number, created_by, ...)
  SELECT id, v_order_number, p_created_by, ...
  FROM quotes WHERE id = p_quote_id
  RETURNING id INTO v_order_id;

  -- Zkopírovat položky
  INSERT INTO order_items (order_id, product_id, ...)
  SELECT v_order_id, product_id, ...
  FROM quote_items WHERE quote_id = p_quote_id;

  -- Aktualizovat quote status
  UPDATE quotes SET status = 'converted' WHERE id = p_quote_id;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 2.3 Zpřísnit RLS policies

**Nová migrace:**

```sql
-- Smazat příliš permisivní policies
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

-- Přidat restriktivní policies
CREATE POLICY "Only admins can delete orders"
ON orders FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can only view own orders or admins all"
ON orders FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### 2.4 Puppeteer connection pool

**Nový soubor:** `src/lib/pdf/browser-pool.ts`

```typescript
import puppeteer, { Browser } from 'puppeteer'

let browserInstance: Browser | null = null
let browserPromise: Promise<Browser> | null = null
const MAX_CONCURRENT = 2
let currentConcurrent = 0

export async function getBrowser(): Promise<Browser> {
  if (currentConcurrent >= MAX_CONCURRENT) {
    throw new Error('Too many concurrent PDF requests')
  }

  if (!browserInstance || !browserInstance.isConnected()) {
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
    browserInstance = await browserPromise
    browserPromise = null
  }

  currentConcurrent++
  return browserInstance
}

export function releaseBrowser() {
  currentConcurrent--
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}
```

---

### 2.5 PostgreSQL SEQUENCE pro order numbers

**Migrace:**

```sql
-- Vytvořit sequence
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Funkce pro generování čísla
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'OBJ-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('order_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Reset sequence na začátku roku (volitelně jako cron job)
-- SELECT setval('order_number_seq', 1, false);
```

---

## Fáze 3: Střední rizika

### 3.1 Přidat DB indexy

```sql
-- Nová migrace
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_quote_items_product_id ON quote_items(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_order_items_product_id ON order_items(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_configurations_pipedrive_status ON configurations(pipedrive_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_sync_log_configuration_id ON sync_log(configuration_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_quotes_status ON quotes(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_orders_status ON orders(status);
```

---

### 3.2 Audit logging

**Nová tabulka:**

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

**Helper funkce:**

```typescript
// src/lib/audit.ts
export async function logAudit(
  supabase: SupabaseClient,
  action: string,
  tableName: string,
  recordId: string,
  oldData?: object,
  newData?: object,
  request?: Request
) {
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('audit_log').insert({
    user_id: user?.id,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
    ip_address: request?.headers.get('x-forwarded-for'),
    user_agent: request?.headers.get('user-agent')
  })
}
```

---

### 3.3 Accessibility opravy

**Keyboard navigation pro tabulky:**

```typescript
// src/components/admin/clickable-table-row.tsx
'use client'

interface ClickableTableRowProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function ClickableTableRow({ href, children, className }: ClickableTableRowProps) {
  const router = useRouter()

  const handleClick = () => router.push(href)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      router.push(href)
    }
  }

  return (
    <TableRow
      className={cn("cursor-pointer hover:bg-muted/50", className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label="Otevřít detail"
    >
      {children}
    </TableRow>
  )
}
```

**Nahradit alert() za toast:**

```typescript
// Místo:
alert('Vyplňte jméno zákazníka')

// Použít:
import { toast } from 'sonner'
toast.error('Vyplňte jméno zákazníka')
```

---

## Fáze 4: Architektura (volitelné)

### 4.1 Separace aplikací

**Struktura:**

```
rentmil-monorepo/
├── packages/
│   └── shared-types/        # Sdílené TypeScript typy
│       ├── src/
│       │   ├── configuration.ts
│       │   ├── quote.ts
│       │   └── index.ts
│       └── package.json
├── apps/
│   ├── configurator/        # Veřejný konfigurátor
│   │   ├── src/
│   │   ├── next.config.js
│   │   └── package.json
│   └── admin/               # Interní admin panel
│       ├── src/
│       ├── next.config.js
│       └── package.json
├── package.json             # Workspace root
└── turbo.json              # Turborepo config
```

**Workspace package.json:**

```json
{
  "name": "rentmil-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "dev:configurator": "turbo run dev --filter=configurator",
    "dev:admin": "turbo run dev --filter=admin"
  }
}
```

---

## Testovací checklist

### Po Fázi 1

- [ ] Ověřit, že nepřihlášený user dostane 401 na všech admin API
- [ ] Ověřit, že non-admin user dostane 403 na admin-only API
- [ ] Ověřit, že Turnstile funguje (nebo failuje správně v prod)
- [ ] Ověřit rate limiting
- [ ] Ověřit webhook rejection bez secret
- [ ] Ověřit, že konfigurace s technology se renderují správně

### Po Fázi 2

- [ ] Měření query count při načtení quotes (mělo by být ~3-4, ne 100+)
- [ ] Test concurrent quote conversion (nesmí být duplicitní order numbers)
- [ ] Test RLS - non-admin nesmí mazat orders
- [ ] Test PDF generation pod zátěží (5 concurrent)

### Po Fázi 3

- [ ] Ověřit DB indexy pomocí EXPLAIN ANALYZE
- [ ] Zkontrolovat audit log po několika operacích
- [ ] Test keyboard navigation v tabulkách
- [ ] Accessibility audit (axe DevTools)

---

## Kontakty a eskalace

**Při kritickém problému:**
1. Zastavit deployment
2. Rollback na předchozí verzi
3. Kontaktovat vývojáře

**Monitoring:**
- Railway dashboard: [link]
- Supabase dashboard: [link]
- Sentry (pokud je): [link]

---

*Dokument vytvořen: 27. prosince 2025*
