# Přelivové bazénové sety

**Status:** Backlog (not started)
**Created:** 2026-04-27
**Priority:** Medium — rozšíření katalogu o nový typ produktu

## Problém

V katalogu existují skimmerové sety (`set4`, `set5`, `set6`, `set65`, `set7`, `set75`) pro obdélníkové bazény. Přelivové bazény stejných rozměrů zatím v katalogu nejsou — když zákazník v konfigurátoru vybere **Obdélník + Přelivový + 4×3×1,2 m**, systém nenajde set a spadne na fallback (`findPoolProduct` přes `BAZ-OBD-PR-...` skelet), což pravděpodobně také nenajde produkt.

Zdroj dat: 6 XLSM souborů ve složce `přeliv/` (`MUSTR PŘELIV {4|5|6|61|7|71}m .xlsm`). Každý obsahuje rozměr, soupis výbavy a celkovou cenu.

## Cíl

Přidat 6 nových produktů kategorie `sety` (přelivové), které:
- Mají **název** dle velikosti (např. „Přelivový bazén 4×3×1,2 m")
- Mají **cenu bez DPH** = celková cena standard + nadstandard z excelu
- Mají **popis** = seznam položek z excelu **bez dílčích cen** (jen názvy + množství)
- Kategorie `sety`, `compatible_shapes` nastavené na obdélníky
- Zobrazí se v `/admin/produkty` jako běžné produkty
- Vyhledají se v konfigurátoru pro **přelivový** typ bazénu

## Data z excelů

Cena bez DPH = pole **„Standard a nadstandard celkem"** (řádek 66, sloupec D). DPH v excelu je 0 % (přenesená daňová povinnost), takže tato hodnota je skutečně cena bez DPH.

| Soubor | Rozměr | Cena bez DPH |
|--------|--------|--------------|
| `MUSTR PŘELIV 4m` | 4×3×1,2 m | 143 318 Kč |
| `MUSTR PŘELIV 5m` | 5×3×1,2 m | 155 797 Kč |
| `MUSTR PŘELIV 6m` | 6×3×1,2 m | 168 275 Kč |
| `MUSTR PŘELIV 61m` | 6×3,5×1,2 m | 180 334 Kč |
| `MUSTR PŘELIV 7m` | 7×3×1,2 m | 182 025 Kč |
| `MUSTR PŘELIV 71m` | 7×3,5×1,2 m | 193 882 Kč |

**Pozn.:** ceny v excelu mají haléře (např. 143 318,19) — zaokrouhlit na celé koruny.

### Soupis položek (popis produktu)

Společné pro všechny sety (množství se mění podle obvodu/velikosti):

```
Standardní výbava:
- Skelet bazénu [rozměr]
- Přelivový žlábek k bazénu (15–22 m dle velikosti)
- Akumulační nádrž 3 m³ KJ
- Mřížka k přelivovému žlábku plastová bílá (15–22 m)
- Písková filtrace komplet 6 m³ (4–5m bazén) / 9 m³ (6–7m bazén)
- Vratná tryska – komplet (2×)
- Propojovací materiál technologie bazénu (do 2 m)
- Románské vnitřní schůdky protiskluz, 4 stupně
- Montáž

V ceně dále:
- Zpětný kuželový ventil 50 mm (2×)
- Uzavírací ventil 50 mm dvoucestný (2×)
- Náplň do pískového filtru 25 kg (2–3 ks)
- Sací tryska na vysavač – samostatná větev
- Prostup do akumulační šachty 50 mm (7×)
```

Konkrétní množství per varianta vytáhneme z excelu při generování seedu (skript).

## Architektonické rozhodnutí

**`SET_DIMENSION_MAP` v `src/lib/quote-generator.ts:280` mapuje pouze `length-width` → set code. Nezohledňuje `pool_type`.** Aby fungoval lookup pro skimmer i přeliv stejných rozměrů, musíme rozlišení přidat.

**Doporučená varianta — kódy se suffixem:**
- Skimmer (existující): `set4`, `set5`, `set6`, `set65`, `set7`, `set75`
- Přeliv (nové): `set4-pr`, `set5-pr`, `set6-pr`, `set65-pr`, `set7-pr`, `set75-pr`

Důvod: minimální změna, jednotný DB sloupec `code`, žádná migrace schématu, konzistentní s existujícím pojmenováním (`-PR` jako u skeletů `BAZ-OBD-PR-…`).

Alternativa (zamítnuta): přidat sloupec `compatible_types: PoolType[]`. Vyžaduje migraci, mění filtry v adminu, není potřeba — kód ve `findSetProduct` už `pool_type` má k dispozici.

### Změna typu `SET_DIMENSION_MAP`

```ts
// Před (současný stav)
export const SET_DIMENSION_MAP: Record<string, string> = {
  '4-3': 'set4',
  ...
}

// Po
export const SET_DIMENSION_MAP: Record<string, { skimmer: string; overflow: string }> = {
  '4-3':   { skimmer: 'set4',  overflow: 'set4-pr' },
  '5-3':   { skimmer: 'set5',  overflow: 'set5-pr' },
  '6-3':   { skimmer: 'set6',  overflow: 'set6-pr' },
  '6-3.5': { skimmer: 'set65', overflow: 'set65-pr' },
  '7-3':   { skimmer: 'set7',  overflow: 'set7-pr' },
  '7-3.5': { skimmer: 'set75', overflow: 'set75-pr' },
}
```

Místa k úpravě:
- `src/lib/quote-generator.ts:305` — `findSetProduct` (selektor `[key][pool_type]`)
- `src/components/admin/set-mapping-section.tsx:24-28` — `getDimensionsForCode` (reverzní lookup musí umět rozlišit oba kódy a vracet i typ)

### Vyřazená pole z plánu

- ❌ **`compatible_shapes` se nepoužívá** — pole existuje pouze v TS typech, **není ve schématu DB** (žádná migrace, žádné field mapování v API ani form). Seed ho nesmí nastavovat.
- Filtrace setu pro obdélníkový tvar funguje implicitně (sety mají jen obdélníkové rozměry; kruh padá v `findSetProduct` na řádku 299).
- Rozdíl `rectangle_rounded` vs `rectangle_sharp` se řeší přes addon „Ostré rohy" (existující mechanika `getAutoSetAddons`).

## Implementační kroky

### 1. Datový seed
- [ ] Vytvořit skript `scripts/seed-overflow-sets.ts` (TS, spustitelný přes `tsx`):
  - Načte 6 XLSM přes `exceljs` (nutno přidat do `devDependencies`)
  - Pro každý soubor extrahuje:
    - Rozměr z R15, sl. A (např. „4x3x1,2")
    - Položky standardu z R15–R23 s qty > 0 (název + kvantita)
    - Položky nadstandardu z R31–R37 s qty > 0
    - Celkovou cenu z R66, sl. D
  - Vygeneruje `description` text (formát viz výše) bez cen, **s konkrétními kvantitami pro tu velikost**
  - Načte odpovídající skimmer set (`set4`, `set5`, …) a zkopíruje `set_addons`, **regeneruje `id` (nová UUID) každého addonu** — zachová `name`, `price`, `sort_order`
  - Upsert do `products` přes Supabase service role client (`code` je unique key, `onConflict: 'code'`)
  - Hodnoty: `name='Přelivový bazén [rozměr] m'`, `code='set{N}-pr'`, `category='sety'`, `unit='ks'`, `unit_price=Math.round(total)`, `price_type='fixed'`, `active=true`, `set_addons=<kopie ze skimmer setu s novými UUIDs>`
  - **NESMÍ nastavovat `compatible_shapes`** (pole neexistuje v DB schémě)
- [ ] Přidat NPM skript: `"seed:overflow-sets": "tsx scripts/seed-overflow-sets.ts"`
- [ ] Přidat dependency: `npm i -D exceljs`

### 2. Konfigurátor — lookup setu dle `pool_type`
- [ ] `src/lib/quote-generator.ts`:
  - Změnit typ `SET_DIMENSION_MAP` na `Record<string, { skimmer: string; overflow: string }>` (viz výše)
  - Upravit `findSetProduct` (řádek ~294):

```ts
const key = `${length}-${width}`
const codes = SET_DIMENSION_MAP[key]
if (!codes) return null

const setCode = codes[config.pool_type as 'skimmer' | 'overflow']
if (!setCode) return null

// zbytek beze změny
```

### 3. Mapování rozměrů → kontrola
- [ ] Ověřit, že **každá kombinace rozměrů z přeliv excelů** je v `DIMENSION_OPTIONS.rectangle` (`src/lib/constants/configurator.ts:269`):
  - 4×3, 5×3, 6×3, 6×3,5, 7×3, 7×3,5 — všechny by měly být dostupné (length 4–7, width 3 nebo 3,5)
  - Hloubka 1,2 m — OK, je v `depths`

### 4. Admin UI

**`/admin/produkty` (seznam):**
- Žádné změny — produkty se zobrazí automaticky (filtr `category='sety'`)
- Editace přes `product-form.tsx` funguje (popis, cena, kód)

**`/admin/produkty/mapovani` a `/admin/nastaveni/produkty/mapovani` (sekce setů):** ⚠️ **musí se upravit**
- `src/components/admin/set-mapping-section.tsx` (řádek 23-28) — `getDimensionsForCode` aktuálně vrací jen `dimKey` přes shodu s `string` hodnotou v MAP. Po změně typu se rozbije.
- Upravit `getDimensionsForCode` aby:
  - Procházel novou strukturu `{ skimmer, overflow }`
  - Vracel `{ dimKey, type: 'skimmer' | 'overflow' } | null`
- Přidat sloupec/badge „Typ" v tabulce setů (Skimmer / Přeliv) — nyní je v něm jen kód a rozměry
- Stats counters: rozdělit nebo nechat společné (počet setů celkem už nebude rovný počtu rozměrů)

**`tags`:** doporučeno přidat tag `prelivovy` k novým setům pro filtraci v admin tabulce

### 5. Set addons
- [ ] Přelivové sety mají **stejné addony jako skimmerové** — seed skript zkopíruje `set_addons` z odpovídajícího skimmerového setu (`set4` → `set4-pr`, atd.)
- [ ] `getAutoSetAddons` v `quote-generator.ts:325` funguje beze změny (matchuje podle názvu addonu, ne podle setu)
- [ ] Po seedu zkontrolovat v `/admin/produkty/{id}` že se addony překopírovaly správně

### 6. Testování (manuální, není unit-test setup)
- [ ] Spustit seed → ověřit 6 produktů v `/admin/produkty`
- [ ] V konfigurátoru projít: Obdélník zaoblený → Přelivový → 4×3×1,2 → ... → vygenerovat nabídku → ověřit že se nabídka založí s cenou 143 318 a popisem ze setu
- [ ] Totéž pro 5×3, 6×3, 6×3,5, 7×3, 7×3,5
- [ ] Kontrola: skimmerové sety stejných rozměrů **stále fungují** beze změny

### 7. Změny v dokumentaci
- [ ] `CLAUDE.md` — sekce „Product Categories" / „Pool Configuration Options" — zmínit, že set codes pro přeliv mají suffix `-pr`
- [ ] `src/lib/changelog-data.ts` — entry „Přidány přelivové bazénové sety 4–7 m"
- [ ] `npm run changelog:translate`

## Rozhodnutí (potvrzeno 2026-04-27)

1. **Set addons**: kopírují se ze skimmerových setů (stejný rozměrový párek `set4` → `set4-pr`).
2. **Zaokrouhlení ceny**: na celé koruny (`Math.round`).
3. **Popis**: konkrétní množství per varianta (15× žlábek pro 4m, 22× pro 7m, atd.) — extrahovat z každého excelu zvlášť.
4. **Skript**: idempotentní upsert podle `code`, aby se dal spustit znovu po úpravě excelu.

## Soubory, které se budou měnit

- `scripts/seed-overflow-sets.ts` (nový)
- `package.json` (`exceljs` dev dependency, nový npm skript)
- `src/lib/quote-generator.ts` (`SET_DIMENSION_MAP` typ + `findSetProduct`)
- `src/components/admin/set-mapping-section.tsx` (`getDimensionsForCode`, UI: typový sloupec)
- `src/lib/changelog-data.ts`
- `CLAUDE.md` (drobnost — pojmenovací konvence `set{N}-pr` pro přeliv)

DB migrace **nejsou potřeba** — `products` má všechna potřebná pole. Pole `compatible_shapes` v TS typech je mrtvé (není v DB) — nesouvisí s tímto úkolem.

## Detailní riziková analýza

### 🔴 KRITICKÉ: Duplicity od mapping rules

**Problém:** `quote-generator.ts:481` při aplikaci mapping rules kontroluje duplicity přes `addedProductIds.has(product.id)` — ale set obsahuje akumulační nádrž / pískovou filtraci / románské schody **jako text v description**, ne jako samostatné `product_id`. Pokud existuje mapping rule typu „pool_type='overflow' → product 'Akumulační nádrž 3m³'", po přidání přeliv setu by se nádrž objevila **dvakrát** (jednou v textu setu, jednou jako samostatná položka).

**Co je v přeliv setu obsaženo (= riziková duplicita s mapping rules):**
- Akumulační nádrž 3 m³ KJ
- Přelivový žlábek + mřížka
- Písková filtrace 6 / 9 m³
- Vratná tryska
- Propojovací materiál
- Románské vnitřní schůdky
- Montáž
- Zpětný kuželový ventil 50 mm, uzavírací ventil 50 mm
- Náplň do pískového filtru
- Sací tryska na vysavač
- Prostup do akumulační šachty 50 mm

**Mitigace (povinné):** před deploy dotaz na DB:
```sql
SELECT mr.name, mr.config_field, mr.config_value, mr.pool_type, p.name AS product
FROM product_mapping_rules mr
JOIN products p ON mr.product_id = p.id
WHERE 'overflow' = ANY(mr.pool_type) OR mr.pool_type IS NULL;
```
Pokud najdeme duplicitu, buď deaktivovat rule, nebo přidat `pool_type=['skimmer']` constraint.

### 🟡 STŘEDNÍ: Idempotentnost vs. manuální úpravy

**Problém:** Skript přes `upsert(onConflict: 'code')` **přepíše** všechna pole — ztratíš manuální úpravy ceny/popisu/addonů, které admin udělá v UI mezi spuštěními.

**Mitigace:**
- Default chování: `INSERT ... ON CONFLICT DO NOTHING` (vytvoří jen neexistující sety)
- Explicitní `--force-update` flag pro reseed po úpravě excelu
- V `--force-update` zachovat sloupce: `pipedrive_id`, `pipedrive_synced_at`, `id`, `created_at` (jen update polí, která pochází z excelu)

### 🟡 STŘEDNÍ: Pipedrive sync vazba

**Problém:** Po prvním seedu má set `pipedrive_id = null`. Po Pipedrive sync se nastaví ID. Pokud pak `--force-update` přepíše field bez ohledu, `pipedrive_id` zůstane (díky nemu, že update do DB neobsahuje toto pole). **Skript ho NESMÍ posílat v update payloadu.**

### 🟢 NÍZKÉ: Addon ID pattern (deterministický)

**Zjištění:** Existující skimmer addony **nepoužívají UUIDs**, ale deterministické stringy: `sa-set4-h13`, `sa-set4-or`, …, `sa-set4-8mm` (zdroj: `seed_set_addons.sql`, `add_8mm_set_addons.sql`).

**Plán:** přeliv addony budou používat pattern `sa-set{N}-pr-{zkratka}` — např. `sa-set4-pr-h13`. **Žádné UUIDs.**

### 🟢 NÍZKÉ: 8. addon „Materiál 8mm"

**Zjištění:** Existuje migrace `20260209000001_add_8mm_set_addons.sql`, která přidala **8. addon** (sort_order=7) ke každému skimmer setu. Cena = 650 Kč × surface area.

**Plán:** zkopírovat **všech 8 addonů** (h13, h14, h15, or, ss, ts, vrs/v_rom_schodiste, 8mm), nejen prvních 7.

### 🟢 NÍZKÉ: Description formátování

**Zjištění:** Existující skimmer sety mají description s bullet points přes `•`:
```
Bazénový skelet obdélníkového tvaru se zakulacenými rohy…

Set obsahuje:
• Vnitřní rohové románské třístupňové schodiště…
• Skimmer, recirkulační trysky
• …
```

Print PDF používá `whitespace-pre-line` (zachovává `\n`).

**Plán:** stejný formát — bullet points `•`, `\n` mezi řádky, žádný markdown.

### 🟢 NÍZKÉ: Backwards compat existujících konfigurací

**Stav před změnou:** Konfigurace s `pool_type='overflow'` + obdélník 4×3 dnes vrátí `set4` (skimmer set — funkčně nesprávně, ale stávající chování).

**Po změně:** Stejná konfigurace vrátí `set4-pr`. Existující **nabídky** (Quote) jsou neměnné (mají uloženou historickou cenu). **Konfigurace bez nabídky** (status='new') dostanou při manuálním vygenerování novou (vyšší) cenu.

**Mitigace:** před deploy zkontrolovat
```sql
SELECT count(*) FROM configurations
WHERE pool_type = 'overflow'
  AND pool_shape IN ('rectangle_rounded', 'rectangle_sharp')
  AND status NOT IN ('quote_sent', 'order_created');
```
Pokud je počet >0, informovat zákazníky (neformálně).

### ⚠️ Existující bug v okolním kódu (mimo skop, ale dobré vědět)

`getAutoSetAddons` v `quote-generator.ts:361` matchuje `name.includes('románské schody')`. Migrace `20260407000001_rename_roman_stairs_addon.sql` přejmenovala addon na **„Vnitřní románské schodiště"** (slovo „schodiště", ne „schody"). **Auto-připnutí addonu pro `stairs='roman'` po této migraci nefunguje.** Tento bug existuje nezávisle na našem úkolu.

## Kontrolní checklist před implementací

- [x] Otázka „ceny addonů u přelivu = ceny addonů u skimmeru" potvrzena uživatelem
- [ ] **DB query**: ověřit existenci 6 skimmer setů s addony (8 ks per set, deterministická IDs)
- [ ] **DB query**: zjistit, jestli existují mapping rules s `pool_type='overflow'` a vyhodnotit duplicity (#kritické)
- [ ] **DB query**: počet existujících konfigurací s `overflow + rectangle_*`, status≠finální
- [ ] Přístup k Supabase service role client v `scripts/` (přes `.env.local` → `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Existence skimmer setů potvrzena (kódy `set4`, `set5`, `set6`, `set65`, `set7`, `set75`)
