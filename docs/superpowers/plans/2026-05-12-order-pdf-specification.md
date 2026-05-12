# Order PDF — přenesení specifikace z nabídky

**Datum:** 2026-05-12
**Varianta:** A (jen úprava PDF rendereru, bez DB migrace, bez změny convertu)
**Scope:** `src/app/orders/[id]/print/page.tsx` + drobnost v `src/app/api/admin/orders/[id]/pdf/route.ts`

## Cíl

Po překlopení nabídky → objednávka chybí v PDF objednávky kompletní specifikace bazénového setu. Dotahnout PDF objednávky na úroveň PDF nabídky:

1. zobrazit popis setu (barva fólie, materiál, technologie z `product.description`),
2. seskupit položky po kategoriích (Skelety / Sety / Schodiště / Doprava…),
3. odstranit duplicitní řádek „Doprava" pod tabulkou,
4. přidat blok „Konfigurace bazénu" (tvar, rozměry, barva, schody, technologie) z `order.pool_config`.

## Současný stav

### Co se přenáší při překlopení (`src/app/api/admin/quotes/[id]/convert/route.ts:137-148`)

`quote_items` → `order_items` 1:1: `product_id, name, description, category, quantity, unit, unit_price, total_price, sort_order`. Plus `order.pool_config = quote.pool_config` (řádek 119).

**Datově se neztrácí nic.** Problém je v rendereru PDF objednávky.

### Co PDF nabídky umí navíc (`src/app/quotes/[id]/print/page.tsx`)

- Načítá items se `JOIN` na produkty (ř. 64): `select('*, product:products(description)')`
- Renderuje položky **seskupené po kategoriích** přes `ItemsSection` (ř. 321–480) — každá kategorie je vlastní karta s nadpisem.
- U setových položek vykresluje šedý box s `product_description` (ř. 393–397).
- Set addony (description začíná `[SA:`) prefix v description odstraňuje (ř. 367).

### Co PDF objednávky teď dělá (`src/app/orders/[id]/print/page.tsx`)

- `getOrder()` (ř. 33–56) — `select('*')` bez JOINu, takže `product.description` nemá k dispozici.
- `ContractPage` (ř. 170–351) — všechny `order_items` v jedné `<table>` (ř. 222–272).
- Pod tabulkou položek **další řádek „Doprava"** generovaný z `order.delivery_method` / `order.delivery_cost` (ř. 254–270) — duplikuje se s `order_item` kategorie `doprava`, který už generuje `quote-generator.ts:553-567`.
- Konfigurace bazénu (`order.pool_config`) se nikde nezobrazuje.

## Tvar dat (referenčně)

### `order.pool_config` (JSONB, viz `quote-editor.tsx:1621`)

```ts
{
  shape: 'circle' | 'rectangle_rounded' | 'rectangle_sharp',
  type: 'skimmer' | 'overflow',
  dimensions: { length?: number, width?: number, depth: number, diameter?: number },
  color: string,
  stairs: string,
  technology: string | string[],
  lighting: string,
  counterflow: string,
  waterTreatment: string,
  waterTreatmentOther: string | null,
  heating: string,
  roofing: string,
} | null
```

Může být `null`, pokud quote nebyla napojena na configuration (např. čistě ručně vytvořená nabídka). Plán to ošetří fallbackem.

### Helper funkce (`src/lib/constants/configurator.ts:298-314`)

`getShapeLabel`, `getTypeLabel`, `getColorLabel`, `getStairsLabel`, `getTechnologyLabel` — vrací české labely. Použiji je beze změny.

### `QUOTE_CATEGORY_LABELS` (`src/lib/constants/categories.ts:52`) + `QUOTE_CATEGORY_ORDER` (ř. 61)

Jediný zdroj pravdy pro názvy a pořadí kategorií. Použiji.

## Implementační kroky

### 1. `getOrder()` — přidat JOIN na produkty

`src/app/orders/[id]/print/page.tsx:46-50` — místo `select('*')` použít `select('*, product:products(description)')`, výsledný `product.description` propsat do položky jako `product_description` (jak to dělá `quotes/[id]/print/page.tsx:89-101`).

Typ: rozšířit lokálně `OrderItem` o `product_description?: string | null`.

### 2. `ContractPage` — nahradit plochou tabulku seskupením po kategoriích

Vytrhnout sekci „Položky objednávky" (ř. 217–273) a:

- Skupit položky podle `item.category`, řadit kategorie podle `QUOTE_CATEGORY_ORDER`.
- Pro každou kategorii kontejner s hlavičkou (`bg-[#01384B] text-white`), uvnitř seznam položek (stejný look jako v nabídce, `ItemsSection`).
- Pro setové položky (`item.category === 'sety'` a description **není** jen `[SA:…]`) zobrazit šedý box s `product_description` pod položkou.
- Set addony (description začíná `[SA:`) — odstranit `[SA:xxx]` prefix přes `description.replace(/^\[SA:[^\]]+\]\s*/, '')`, zobrazit pod parentem (lehce odsazené).
- Položky kategorie `doprava` s `total_price === 0` → label „Zdarma" (zelený).

### 3. Odstranit duplicitní řádek „Doprava" pod tabulkou

`ContractPage` ř. 254–270 → smazat (nebo zachovat jen jako fallback, když `order_items` neobsahují žádnou položku kategorie `doprava`, což by se v praxi nemělo stávat, ale chrání to starší objednávky vytvořené ručně).

Bezpečný compromis: pokud `items.some(i => i.category === 'doprava')`, řádek nezobrazit.

### 4. Přidat blok „Konfigurace bazénu"

Nad sekci „Položky objednávky" (mezi „Smluvní strany" a položky) přidat kartu:

- Vykreslit jen pokud `order.pool_config` není null.
- 2–3 sloupcový grid (responsive): Tvar, Typ, Rozměry, Barva, Schodiště (pokud `!== 'none'`), Technologie.
- Styl stejný jako „Smluvní strany" (gray-50 podklad, sekční nadpis s `border-b-2 border-[#48A9A6]`).
- Helper `formatDimensions(shape, dims)` — buď reusnout z `quote-editor.tsx:formatDimensions`, nebo si udělat lokální (jednoduchá funkce — pokud `circle`: `Ø{diameter} × {depth} m`, jinak `{length} × {width} × {depth} m`).

### 5. PDF route — selektor pro `waitForContent`

`src/app/api/admin/orders/[id]/pdf/route.ts:92` čeká na `'table'` na content stránce. Po změně bude content sekce položek řešena `<div>` strukturou. Možnosti:

- **A)** Zachovat na content stránce nějakou `<table>` (např. tabulka „Smluvní strany" by mohla být tabulkou, ale aktuálně je `<div className="grid grid-cols-2">`). Nepraktické.
- **B)** Změnit waitForContent selektor na něco, co bude přítomno — třeba přidat na kontejner položek `data-pdf-content="items"` a čekat na `[data-pdf-content="items"]`.

Půjdu cestou B — nejmenší zásah do PDF infrastruktury.

## Riziko a trade-offy

- **PDF se generuje on-demand z aktuálního katalogu.** Pokud admin změní `product.description` na setu, stará objednávka při dalším download PDF zobrazí nový popis. Pro fyzicky podepsaný papír nic neznamená, ale online preview/redownload ano. **Uživatel s tímto chováním souhlasil** (jinak by šel do varianty B se snapshotem).
- **`pool_config` může být `null`** u objednávek bez napojené konfigurace. Blok „Konfigurace bazénu" pak prostě nevykreslím.
- **Backfill ne**, žádná migrace. Stará data se po deployi zachovají, jen se začnou jinak vykreslovat.
- **`waitForContent` selektor** — pokud změnu nepropíšu do PDF route, Puppeteer pojede dál (čekání není `critical: false`? Je `critical: true` ř. 92), ale fakticky čeká až do timeoutu pak pokračuje. Lepší to opravit hned.
- **Žádný impact na ostatní PDF.** Production sheet (`/production/[id]/print`) a quote print zůstávají beze změny.
- **Žádný impact na convert endpoint, na DB, na API routes.** Jen renderer.

## Co NEMĚNÍM

- DB schéma `order_items` ani `orders`.
- `src/app/api/admin/quotes/[id]/convert/route.ts` — překlopení dat zůstává jak je.
- `src/lib/quote-generator.ts` — generování doprava položek beze změny.
- `src/app/api/admin/orders/[id]/pdf/route.ts` — kromě selektoru `waitForContent` (jeden řetězec).
- Title / Clauses / Signature stránky PDF objednávky.

## Rozhodnutí (2026-05-12)

1. **Doprava** — kombinovat položku z `order_items` se způsobem dopravy z `order.delivery_method`: např. „Doprava — Rentmil s.r.o. (DAP)" jako label, cena/„Zdarma" jako hodnota.
2. **Konfigurace bazénu** — zobrazit **kompletní** specifikaci, tj. všechna pole z `pool_config`: shape, type, dimensions, color, stairs, technology, lighting, counterflow, waterTreatment (+ otherText fallback), heating, roofing. Hodnoty `'none'` skrývat. Helpery: `getShapeLabel`, `getTypeLabel`, `getColorLabel`, `getStairsLabel`, `getTechnologyLabel`, `getLightingLabel`, `getCounterflowLabel`, `getWaterTreatmentLabel(id, otherText)`, `getHeatingLabel`, `getRoofingLabel` — všechny z `src/lib/constants/configurator.ts`.
3. **Pořadí kategorií** — použít `QUOTE_CATEGORY_ORDER` ze `src/lib/constants/categories.ts`.

## Akceptační kritéria

1. Po překlopení nabídky → objednávka obsahuje PDF objednávky pod každou setovou položkou šedý box s popisem (barva fólie, technologie atd.).
2. Položky jsou seskupené po kategoriích, ne v jedné ploché tabulce.
3. Doprava se v PDF objevuje právě jednou.
4. Nad položkami je karta „Konfigurace bazénu" s tvarem, typem, rozměry, barvou, schody (pokud má), technologií.
5. Pokud `order.pool_config` je `null`, karta se nezobrazí (a layout nepadá).
6. PDF se generuje bez chyby Puppeteer (waitForContent najde selektor).
7. Stávající stránky PDF (title, clauses, signature) vypadají nezměněně.
