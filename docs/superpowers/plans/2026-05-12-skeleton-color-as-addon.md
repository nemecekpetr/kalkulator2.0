# Barva skeletu jako addon v nabídce

**Datum:** 2026-05-12

## Cíl

V editoru nabídky doplnit pod každý skelet/set výběr barvy skeletu — stejnou formou, jakou má dnes admin výběr schodů, hloubky nebo materiálu (checkbox/radio, cena `(0 Kč)` v závorce). Vybraná barva se uloží jako položka nabídky, automaticky se přenese do objednávky a v PDF se objeví pod skeletem/setem s textem „v ceně skeletu" / „v ceně bazénového setu" namísto částky.

## Proč

Dnes barva přijde z konfigurátoru do `quote.pool_config.color` a zobrazuje se jen jako read-only přehled. Měnit ji v nabídce nejde. U **ručně vytvořených nabídek** (bez konfigurace) admin barvu nemá kam zadat vůbec — `pool_config` zůstane prázdný. Dotčené jsou tři reálné objednávky (NAB-360426, NAB-580426, NAB-110326). PDF objednávky pak nemá barvu odkud vzít, což je smluvní problém — zákazník objednává konkrétní vzhled.

## Návrh

Barva bude **child položkou** pod parent skeletem/setem. Stejný princip, jaký dnes používají set addons (`[SA:addonId]` prefix v `description`):

```
Bazénový set 6×3×1.2m              105 900 Kč   ← parent
  └─ Barva skeletu: Modrá       v ceně setu    ← child (nová logika)
  └─ Hloubka 1,3m                  +4 500 Kč   ← child (stávající set addon)
```

V DB se vazba k parentu pozná podle prefixu `[COLOR:{id}]` v `description` (např. `[COLOR:blue] v ceně bazénového setu`). Žádná migrace, žádné nové sloupce. Stávající kopírování `quote_items` → `order_items` při převodu nabídky na objednávku tím pádem funguje beze změny.

V UI quote-editoru se pod každou položkou kategorie `skelety` nebo `sety` objeví řádek **„Barva skeletu"** s checkboxy ze seznamu `POOL_COLORS` (modrá, bílá, šedá, písková…). Single-select — vždy je zaškrtnutá právě jedna, kliknutí na jinou předchozí odznačí. Vizuálně to bude stejný řádek, jaký už je dnes „Doplňky" pod sety.

## Datový tok

1. **Nová nabídka z konfigurátoru** — `quote-generator.ts` při generování položek automaticky doplní child color item z `configuration.color`. Admin nemusí klikat.
2. **Ruční nabídka** — admin v UI zaškrtne barvu, vznikne stejný child item.
3. **Změna barvy** — edituje se existující child item (přepíše se `name` a `description`), nevzniká duplikát.
4. **Převod nabídky na objednávku** — beze změny logiky, kopíruje se s prefixem v description.
5. **PDF (nabídka i objednávka)** — child item se renderuje pod parentem, ve sloupci ceny se místo `0 Kč` zobrazí text za prefixem (`v ceně skeletu` / `v ceně bazénového setu`).

## Soubory na úpravu

| Soubor | Co se mění | Rozsah |
|---|---|---|
| `src/components/admin/quote-editor.tsx` | Nový stav `colorInfo`, parsing `[COLOR:…]` při loadu, JSX řádek „Barva skeletu", handler `onToggleColor` | ~80 řádků |
| `src/lib/quote-generator.ts` | Auto-fill barvy při generování z konfigurace | ~15 řádků |
| `src/app/quotes/[id]/print/page.tsx` | Renderování child color item (text místo ceny) | ~10 řádků |
| `src/app/orders/[id]/print/page.tsx` | Totéž pro PDF objednávky | ~10 řádků |

**Žádná DB migrace. Žádný backfill starých dat.**

## Otevřené body k odsouhlasení

1. **Per-item versus per-quote.** Doporučuji per-item (každý skelet má svou barvu) — konzistentní se zbytkem UI a budoucně bezpečnější. Per-quote (jedna barva pro celou nabídku) je jednodušší, ale neškáluje, pokud by někdy v nabídce byly dva skelety.
2. **Backfill starých nabídek/objednávek bez barvy.** Doporučuji nedělat — staré objednávky jsou už uzavřené, řeší se jen nové. U rozpracovaných si admin barvu přidá ručně přes nové UI.
3. **Blok „Konfigurace bazénu" v PDF objednávky.** Po implementaci tam barva bude redundantní (jednou v bloku, jednou jako položka). Doporučuji blok ponechat — funguje jako shrnutí specifikace, položka jako právní zápis. Pokud bys ho chtěl naopak zúžit (nezobrazovat barvu v bloku), je to o pár řádků navíc.

## Riziko a trade-offy

- **Konzistence s existujícím set_addons mechanismem** — stejný persistence pattern (prefix v description), žádná nová abstrakce.
- **Quote editor je už dost komplexní** (~2200 řádků). Tato změna ho dál rozšíří, ale logika kopíruje vzor `[SA:…]` set addonů, takže se nezavádí nový princip.
- **PDF formátování** — ve sloupci ceny bude místo částky text. Třeba ověřit, že úzký sloupec text rozumně zalomí (zkusím v testu po implementaci).
- **Vícenásobný skelet v nabídce** — každý dostane vlastní barvu, žádná sdílená logika napříč nabídkou.

## Akceptační kritéria

1. V `/admin/nabidky/[id]/upravit` se pod každým skeletem/setem zobrazí řádek „Barva skeletu" s checkboxy ze všech `POOL_COLORS`, každý s `(+0 Kč)`.
2. Single-select chování: zaškrtnutí jiné barvy automaticky odznačí předchozí; nelze mít žádnou ani dvě.
3. Při nové nabídce vytvořené z konfigurátoru je barva předvyplněná z konfigurace.
4. Ruční nabídka bez napojení na konfiguraci umožní admin barvu zaškrtnout.
5. Po uložení nabídky se barva persistuje jako child quote_item s prefixem `[COLOR:…]` v description.
6. Po převodu na objednávku barva projde do order_items beze změny.
7. PDF nabídky i objednávky zobrazí pod parent skeletem/setem řádek „Barva skeletu: Modrá" s textem „v ceně skeletu" (resp. „v ceně bazénového setu") místo částky.
8. Existující nabídky bez barvy se nepoškodí.

## Odhad

2–3 hodiny vývoje + 30 min testování (nová nabídka z konfigurátoru, ruční nabídka, převod do objednávky, PDF).
