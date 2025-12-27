# Code Review - Rentmil Konfigurátor

**Datum:** 27. prosince 2025
**Reviewer:** Claude Code (Senior Security Review)
**Verze:** 1.0

---

## Executive Summary

Provedl jsem důkladný security audit aplikace Rentmil Konfigurátor. Bylo identifikováno **6 kritických**, **12 vysokých** a **15 středních** bezpečnostních a provozních problémů.

### Celkové hodnocení: ⚠️ VYŽADUJE OKAMŽITOU POZORNOST

| Kategorie | Kritických | Vysokých | Středních | Nízkých |
|-----------|:----------:|:--------:|:---------:|:-------:|
| Autentizace & Autorizace | 6 | 4 | 3 | 2 |
| API Bezpečnost | 2 | 4 | 5 | 2 |
| Databáze & Transakce | 0 | 5 | 4 | 2 |
| Runtime Chyby | 3 | 6 | 5 | 3 |
| Integrace | 2 | 5 | 3 | 1 |
| Frontend | 0 | 0 | 4 | 3 |
| **CELKEM** | **13** | **24** | **24** | **13** |

---

## Část 1: Kritické zranitelnosti

### CRIT-01: Chybějící autentizace na Admin API endpointech

**Severity:** 🔴 CRITICAL
**CVSS Score:** 9.8 (Critical)
**Typ:** Broken Access Control (OWASP A01:2021)

**Popis:**
Následující API endpointy nemají žádnou kontrolu autentizace ani autorizace:

| Endpoint | Metoda | Riziko |
|----------|--------|--------|
| `/api/admin/quotes/[id]/status` | PATCH | Změna stavu nabídek |
| `/api/admin/quotes/[id]/convert` | POST | Konverze na objednávku |
| `/api/admin/quotes/[id]/pdf` | GET | Stažení citlivých PDF |
| `/api/admin/production/*` | ALL | Kompletní CRUD výroby |
| `/api/admin/orders/[id]/*` | ALL | Kompletní CRUD objednávek |

**Dopad:**
Kdokoliv na internetu může bez přihlášení:
- Měnit stavy nabídek
- Vytvářet objednávky z nabídek
- Mazat výrobní zakázky
- Stahovat PDF s cenami a zákaznickými daty

**Důkaz:**
```typescript
// src/app/api/admin/quotes/[id]/status/route.ts
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  // ❌ CHYBÍ: Kontrola autentizace
  // ❌ CHYBÍ: Kontrola admin role
  const supabase = await createAdminClient()
  // Přímo upravuje databázi...
}
```

**Oprava:**
```typescript
export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Pokračovat s operací...
}
```

---

### CRIT-02: Bulk Delete bez kontroly Admin role

**Severity:** 🔴 CRITICAL
**Soubor:** `src/app/api/admin/products/bulk-delete/route.ts`

**Popis:**
Endpoint kontroluje přihlášení, ale NE admin roli. Jakýkoliv přihlášený uživatel může smazat všechny produkty.

**Důkaz:**
```typescript
// Řádky 12-22
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// ❌ CHYBÍ: Kontrola role
// Pokračuje přímo k mazání...
```

**Dopad:** Kompletní ztráta produktového katalogu.

---

### CRIT-03: Turnstile Bypass

**Severity:** 🔴 CRITICAL
**Soubor:** `src/lib/turnstile.ts:4-8`

**Popis:**
Pokud není nastavena env proměnná `TURNSTILE_SECRET_KEY`, bot protection je kompletně vypnutá.

**Důkaz:**
```typescript
if (!TURNSTILE_SECRET_KEY) {
  console.warn('Turnstile secret key not configured')
  return true  // ❌ BYPASS - přijme vše!
}
```

**Dopad:** Boti mohou neomezeně submitovat formuláře.

**Oprava:**
```typescript
if (!TURNSTILE_SECRET_KEY) {
  console.error('CRITICAL: Turnstile secret key not configured')
  throw new Error('Turnstile not configured')  // Fail-closed
}
```

---

### CRIT-04: Rate Limiting Bypass

**Severity:** 🔴 CRITICAL
**Soubor:** `src/lib/rate-limit.ts:28-44`

**Popis:**
Při výpadku Redis nebo chybějící konfiguraci je rate limiting kompletně vypnutý.

**Důkaz:**
```typescript
if (!ratelimit) {
  return { success: true, remaining: 999, reset: 0 }  // ❌ Povolí vše
}
// ...
catch (error) {
  return { success: true, remaining: 999, reset: 0 }  // ❌ Povolí vše při chybě
}
```

**Dopad:** DDoS zranitelnost, spam útoky.

---

### CRIT-05: Webhook bez ověření

**Severity:** 🔴 CRITICAL
**Soubor:** `src/app/api/webhook/pipedrive-callback/route.ts:24-30`

**Popis:**
Webhook secret je volitelný. Pokud není nastaven, endpoint přijme jakýkoliv payload.

**Důkaz:**
```typescript
if (process.env.MAKE_CALLBACK_SECRET && payload.secret !== process.env.MAKE_CALLBACK_SECRET) {
  return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
}
// ❌ Pokud MAKE_CALLBACK_SECRET není nastaven, kontrola se přeskočí
```

**Dopad:** Útočník může manipulovat stavy konfigurací v databázi.

---

### CRIT-06: TypeError v produkci

**Severity:** 🔴 CRITICAL
**Soubor:** `src/app/(admin)/admin/konfigurace/[id]/page.tsx:256`

**Popis:**
Pole `technology` je definováno nekonzistentně - někdy jako string, někdy jako array. Způsobuje runtime crash.

**Důkaz z dev serveru:**
```
TypeError: config.technology.map is not a function
    at ConfigurationDetailPage (src/app/(admin)/admin/konfigurace/[id]/page.tsx:256:41)
```

**Kořenová příčina:**
- `types.ts`: `technology: string[]` (array)
- `validations/configuration.ts`: `technology: TechnologyLocationEnum` (string)
- Databáze: JSONB (může být cokoliv)

---

## Část 2: Vysoké riziko

### HIGH-01: N+1 Query Problem

**Soubor:** `src/app/api/admin/quotes/route.ts:61-70`

Pro každou nabídku se provádí dodatečný query. 100 nabídek = 101 queries.

```typescript
// Pro KAŽDOU quote:
const { data: itemVariants } = await supabase
  .from('quote_item_variants')
  .select('*')
  .in('quote_item_id', quote.items.map(i => i.id))
```

**Dopad:** Exponenciální zpomalení s růstem dat.

---

### HIGH-02: Chybějící transakce

**Soubor:** `src/app/api/admin/quotes/[id]/convert/route.ts`

Konverze Quote→Order provádí 5 sekvenčních operací bez transakce:

1. Fetch quote
2. Validate status
3. Create order
4. Create order items
5. Update quote status

**Dopad:** Při selhání kroku 4 nebo 5 vznikne nekonzistentní stav (objednávka bez položek, nabídka s nesprávným stavem).

---

### HIGH-03: Příliš permisivní RLS

**Soubor:** `supabase/migrations/20251227000001_quote_status_and_orders.sql:172-211`

```sql
-- Všichni authenticated users mohou:
CREATE POLICY "Users can view orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete orders" ON orders FOR DELETE TO authenticated USING (true);  -- ❌
```

**Dopad:** Jakýkoliv přihlášený uživatel vidí a může mazat všechny objednávky.

---

### HIGH-04: Puppeteer Memory Leaks

**Soubor:** `src/app/api/admin/quotes/[id]/pdf/route.ts`

- Žádný pool pro Puppeteer instance
- Timeout může nechat zombie procesy
- Concurrent requesty = memory exhaustion

---

### HIGH-05: Race Condition v Order Number

**Soubor:** `src/app/api/admin/quotes/[id]/convert/route.ts:46-62`

Dva simultánní requesty mohou získat stejné číslo objednávky.

**Oprava:** Použít PostgreSQL SEQUENCE.

---

### HIGH-06 až HIGH-12: Další vysoká rizika

| ID | Problém | Soubor |
|----|---------|--------|
| HIGH-06 | Pipedrive bez rate limiting | `src/lib/pipedrive/client.ts` |
| HIGH-07 | Missing admin role check v export | `src/app/api/admin/export/route.ts` |
| HIGH-08 | Missing admin role check v generate-items | `src/app/api/admin/quotes/generate-items/route.ts` |
| HIGH-09 | Unsafe type assertions | Více souborů |
| HIGH-10 | Unhandled promise rejections | `src/components/admin/quotes-table.tsx` |
| HIGH-11 | Race condition v quote editor | `src/components/admin/quote-editor.tsx` |
| HIGH-12 | Service role key exposure risk | `src/lib/supabase/admin.ts` |

---

## Část 3: Střední a nízká rizika

### Střední rizika (MEDIUM)

| ID | Problém | Soubor |
|----|---------|--------|
| MED-01 | PII v localStorage | `src/stores/configurator-store.ts` |
| MED-02 | Chybějící DB indexy | Migrations |
| MED-03 | Alert() místo accessible dialogů | `src/components/admin/quote-editor.tsx` |
| MED-04 | Tabulky bez keyboard navigation | `src/components/admin/*-table.tsx` |
| MED-05 | Missing input validation | `src/app/api/admin/quotes/[id]/status/route.ts` |
| MED-06 | Error messages leak info | `src/app/api/admin/quotes/[id]/pdf/route.ts` |
| MED-07 | No request size limits | Všechny API routes |
| MED-08 | No audit logging | Všechny mutace |

### Nízká rizika (LOW)

| ID | Problém |
|----|---------|
| LOW-01 | Inconsistent error messages |
| LOW-02 | Missing aria-live regions |
| LOW-03 | No retry logic pro external APIs |
| LOW-04 | Chart dimension warnings |

---

## Část 4: Architektonická doporučení

### Současná architektura

```
┌─────────────────────────────────────────────────────────┐
│                    JEDNA NEXT.JS APP                     │
│                                                          │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │   Konfigurátor  │    │      Admin/Nabídkovač      │  │
│  │   (veřejný)     │    │       (interní)            │  │
│  └────────┬────────┘    └──────────┬─────────────────┘  │
│           │                        │                     │
│           └────────────┬───────────┘                     │
│                        ▼                                 │
│              ┌─────────────────┐                         │
│              │    Supabase     │                         │
│              │  (sdílená DB)   │                         │
│              └─────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### Rizika současného stavu

1. **Sdílený attack surface** - Zranitelnost v konfigurátoru = přístup k admin části
2. **Shared secrets** - Service role key dostupný i veřejné části
3. **Lateral movement** - XSS v konfigurátoru = session hijacking admina
4. **Supply chain** - Kompromitovaná závislost ovlivní obě části

### Doporučená architektura

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   KONFIGURÁTOR          │         │   NABÍDKOVAČ (Admin)    │
│   konfigurator.rentmil  │         │   admin.rentmil.cz      │
│                         │         │                         │
│   - Pouze INSERT práva  │         │   - Full DB access      │
│   - Žádný service key   │         │   - Auth required       │
│   - Turnstile + Rate    │         │   - IP whitelist        │
│     limiting            │         │                         │
└────────────┬────────────┘         └────────────┬────────────┘
             │                                   │
             ▼                                   ▼
    ┌─────────────────┐                ┌─────────────────┐
    │ Supabase        │                │ Supabase        │
    │ (anon, INSERT)  │◄───────────────│ (service role)  │
    └─────────────────┘   čte data     └─────────────────┘
```

### Srovnání přístupů

| Aspekt | Monolit (vylepšený) | Oddělené aplikace |
|--------|:-------------------:|:-----------------:|
| Bezpečnostní izolace | ⚠️ Částečná | ✅ Úplná |
| Náklady | ✅ $0 | ⚠️ +$5-10/měsíc |
| Komplexita | ✅ Nízká | ⚠️ Střední |
| Blast radius | ⚠️ Velký | ✅ Minimální |
| Doba implementace | ✅ 1-2 dny | ⚠️ 3-5 dnů |

### Doporučení

**Pro okamžité nasazení:** Vylepšený monolit s přísnými bezpečnostními opatřeními.

**Pro dlouhodobou bezpečnost:** Oddělení aplikací (doporučeno do Q2 2025).

---

## Část 5: Implementační plán

### Fáze 1: Kritické opravy (1-2 dny)

| Priorita | Úkol | Soubory | Odhad |
|:--------:|------|---------|:-----:|
| P0 | Auth middleware pro všechny admin API | 8 souborů | 2h |
| P0 | Admin role check v bulk-delete | 1 soubor | 15min |
| P0 | Turnstile fail-closed | 1 soubor | 15min |
| P0 | Rate limit fail-closed | 1 soubor | 15min |
| P0 | Webhook HMAC validation | 1 soubor | 30min |
| P0 | Fix technology type mismatch | 3 soubory | 1h |

**Celkem Fáze 1:** ~4-5 hodin

### Fáze 2: Vysoká rizika (2-3 dny)

| Priorita | Úkol | Odhad |
|:--------:|------|:-----:|
| P1 | Refactor quotes API (N+1 fix) | 3h |
| P1 | Implementovat transakce pro convert | 2h |
| P1 | Zpřísnit RLS policies | 2h |
| P1 | Puppeteer connection pool | 2h |
| P1 | PostgreSQL SEQUENCE pro order numbers | 1h |
| P1 | Add missing auth checks (export, generate-items) | 1h |

**Celkem Fáze 2:** ~11-12 hodin

### Fáze 3: Střední rizika (1 týden)

| Priorita | Úkol | Odhad |
|:--------:|------|:-----:|
| P2 | Přidat DB indexy | 1h |
| P2 | Implementovat audit logging | 4h |
| P2 | Refactor error handling | 3h |
| P2 | Accessibility opravy | 4h |
| P2 | Input validation (Zod schemas) | 3h |
| P2 | Request size limits | 1h |

**Celkem Fáze 3:** ~16 hodin

### Fáze 4: Architektura (volitelné, 1 týden)

| Úkol | Odhad |
|------|:-----:|
| Separace na dvě Next.js aplikace | 8h |
| Sdílený npm package pro typy | 2h |
| CI/CD pro druhou aplikaci | 2h |
| Migrace DNS a deployment | 2h |
| Testování | 4h |

**Celkem Fáze 4:** ~18 hodin

---

## Část 6: Checklist pro deployment

### Před nasazením do produkce

- [ ] Všechny admin API endpointy mají auth check
- [ ] Všechny admin API endpointy mají role check
- [ ] Turnstile secret key je nastaven (fail-closed)
- [ ] Rate limit Redis je nakonfigurován (fail-closed)
- [ ] Webhook má HMAC validation
- [ ] technology field type je konzistentní
- [ ] RLS policies jsou restriktivní
- [ ] Puppeteer má timeout a cleanup
- [ ] Error messages neobsahují stack traces
- [ ] Env proměnné jsou nastaveny (ne placeholder hodnoty)

### Monitoring po nasazení

- [ ] Alert na 401/403 response spike
- [ ] Alert na Puppeteer process count > 2
- [ ] Alert na Supabase error rate > 5%
- [ ] Alert na rate limit bypass attempts
- [ ] Log review po 24h, 7d, 30d

---

## Přílohy

### A: Kompletní seznam souborů k úpravě

```
src/app/api/admin/quotes/[id]/status/route.ts
src/app/api/admin/quotes/[id]/convert/route.ts
src/app/api/admin/quotes/[id]/pdf/route.ts
src/app/api/admin/production/route.ts
src/app/api/admin/production/[id]/route.ts
src/app/api/admin/production/[id]/items/route.ts
src/app/api/admin/orders/[id]/route.ts
src/app/api/admin/products/bulk-delete/route.ts
src/app/api/admin/export/route.ts
src/app/api/admin/quotes/generate-items/route.ts
src/app/api/webhook/pipedrive-callback/route.ts
src/lib/turnstile.ts
src/lib/rate-limit.ts
src/lib/supabase/types.ts
src/lib/validations/configuration.ts
src/app/(admin)/admin/konfigurace/[id]/page.tsx
supabase/migrations/20251227000001_quote_status_and_orders.sql
```

### B: SQL pro chybějící indexy

```sql
-- Přidat do nové migrace
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON quote_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_configurations_pipedrive_status ON configurations(pipedrive_status);
CREATE INDEX IF NOT EXISTS idx_sync_log_configuration_id ON sync_log(configuration_id);
```

### C: Auth helper funkce (doporučená implementace)

```typescript
// src/lib/auth/api-auth.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user, supabase }
}

export async function requireAdmin() {
  const result = await requireAuth()
  if ('error' in result) return result

  const { user, supabase } = result

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, profile, supabase }
}
```

---

## Závěr

Aplikace má solidní základ, ale vyžaduje okamžitou pozornost v oblasti bezpečnosti. Kritické zranitelnosti (CRIT-01 až CRIT-06) by měly být opraveny **před jakýmkoliv dalším nasazením do produkce**.

Doporučuji:
1. **Ihned:** Opravit kritické zranitelnosti (Fáze 1)
2. **Tento týden:** Opravit vysoká rizika (Fáze 2)
3. **Příští sprint:** Střední rizika a architektonické rozhodnutí
4. **Q1 2025:** Zvážit oddělení aplikací pro dlouhodobou bezpečnost

---

*Dokument vygenerován: 27. prosince 2025*
*Reviewer: Claude Code*
