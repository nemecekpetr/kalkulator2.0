# Filtr stavu konfigurace (Nové / Zpracované)

**Datum:** 2026-05-12

## Cíl

Na stránce `/admin/konfigurace` přidat do filtrovacího řádku select pro **stav konfigurace** (`new` / `processed`), aby admin mohl rychle zobrazit jen nové neodbavené konfigurace. Aktuálně tam je jen filtr na **Pipedrive status** (success / pending / error), což ale neodpovídá tomu, jestli admin konfiguraci řešil — to drží sloupec `configurations.status` (Nová / Zpracovaná).

## Současný stav

Backend i drobné UI prvky jsou připravené:

- **`src/app/(admin)/admin/konfigurace/page.tsx:38-41`** — server-side query už čte `searchParams.status` a aplikuje `query.eq('status', filters.status)`. Funkční.
- **`src/components/admin/configurations-filters.tsx:22`** — komponenta čte `status` z URL.
- **`src/components/admin/configurations-filters.tsx:35-44`** — `updateFilters({ status })` handler funguje.
- **`src/components/admin/configurations-filters.tsx:76-82`** — `getStatusLabel()` mapuje hodnoty na české labely.
- **`src/components/admin/configurations-filters.tsx:136-145`** — badge aktivního filteru se zobrazí.
- **`src/components/admin/configurations-filters.tsx`** — **CHYBÍ `<Select>` v JSX** mezi vyhledáváním a Pipedrive selectem.

Tj. backend je 100% připravený, UI je z 90 % hotové, jen visí prázdný „pull through" do selectu.

## Návrh řešení

Přidat jedno `<Select>` v komponentě `configurations-filters.tsx` před Pipedrive select. Hodnoty:

- `all` → „Všechny stavy" (default)
- `new` → „Nové"
- `processed` → „Zpracované"

Použít stejný styl a šířku jako stávající Pipedrive select (`w-full sm:w-48`).

## Implementační kroky

### Jediný soubor: `src/components/admin/configurations-filters.tsx`

Mezi řádky 107 a 108 (přesněji za blok „Search", před blok „Pipedrive status filter") vložit:

```tsx
{/* Configuration status filter */}
<Select
  value={status}
  onValueChange={(value) => updateFilters({ status: value })}
>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue placeholder="Stav konfigurace" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Všechny stavy</SelectItem>
    <SelectItem value="new">Nové</SelectItem>
    <SelectItem value="processed">Zpracované</SelectItem>
  </SelectContent>
</Select>
```

Nic jiného neměnit. Helper `getStatusLabel` i badge logika už existují a začnou se rovnou používat, jakmile se select vyrenderuje.

## Akceptační kritéria

1. Na `/admin/konfigurace` je v řádku filtrů nový select „Stav konfigurace" (vlevo od Pipedrive selectu).
2. Default hodnota: „Všechny stavy".
3. Volba „Nové" zúží seznam jen na konfigurace ve stavu `new` (URL: `?status=new`).
4. Volba „Zpracované" zúží na `processed` (URL: `?status=processed`).
5. Při aktivním filtru se nad tabulkou zobrazí badge „Stav: Nové" (resp. „Zpracované") s křížkem na zrušení.
6. Filtr je kombinovatelný s vyhledáváním i s Pipedrive filterem.
7. Volba se propíše do URL (sdílení odkazu) a zachová se přes navigaci paginací.

## Rozsah

- **1 soubor**, ~15 řádků JSX.
- Žádná DB migrace, žádná změna API, žádná změna typů.

Odhad: 5 minut implementace + 2 minuty test.
