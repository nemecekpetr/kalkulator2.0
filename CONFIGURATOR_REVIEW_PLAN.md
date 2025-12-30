# Plán revize konfigurátoru bazénů Rentmil

**Datum vytvoření:** 29. prosince 2025
**Cíl:** Projít krok za krokem konfigurátor a vyladit každý krok k dokonalosti z pohledu UX, obsahu a generovaných schémat.

---

## Přehled kroků

| Krok | Název | Priorita revize | Status |
|:----:|-------|:---------------:|:------:|
| 1 | Tvar bazénu | Střední | ⬜ |
| 2 | Typ bazénu | Vysoká | ⬜ |
| 3 | Rozměry | Nízká | ⬜ |
| 4 | Barva | Střední | ⬜ |
| 5 | Schodiště | Vysoká | ⬜ |
| 6 | Technologie | Vysoká | ⬜ |
| 7 | Příslušenství | Střední | ⬜ |
| 8 | Vytápění | Střední | ⬜ |
| 9 | Zastřešení | Střední | ⬜ |
| 10 | Kontakt | Kritická | ⬜ |
| 11 | Shrnutí | Střední | ⬜ |
| - | Globální komponenty | Vysoká | ⬜ |

---

## Krok 1: Tvar bazénu (Shape)

### Současný stav
- SVG animace vody při hoveru
- Tag systém (Nejlevnější, Moderní, Tradiční)
- Benefity u každé varianty
- Tip box na konci

### UX vylepšení
- [ ] Benefity jako seznam místo textu odděleného `•`
- [ ] Přidat `aria-label` s kompletním popisem na OptionCard
- [ ] Respektovat `prefers-reduced-motion` pro animace

### Obsahové vylepšení
- [ ] Ověřit správnost benefitů s Rentmil
- [ ] Přidat informaci o ceně (kruhový = nejlevnější)
- [ ] Vylepšit tip box - přidat konkrétní doporučení podle účelu

### Schémata
- [ ] SVG vizualizace jsou kvalitní ✓

---

## Krok 2: Typ bazénu (Type)

### Současný stav
- Pros/cons seznam
- Tag "Premium" a "Doporučeno"
- 2-sloupcový layout

### UX vylepšení
- [ ] Vizuálně oddělit pros od cons (background color)
- [ ] **PŘIDAT SVG DIAGRAMY** vysvětlující rozdíl skimmer vs overflow

### Obsahové vylepšení
- [ ] Přidat cenový indikátor (overflow = dražší)
- [ ] Vylepšit popis - srozumitelněji vysvětlit technický rozdíl
- [ ] Přidat "Pro koho je vhodný" sekci

### Schémata
- [ ] **VYTVOŘIT** diagram skimmer bazénu
- [ ] **VYTVOŘIT** diagram overflow bazénu

---

## Krok 3: Rozměry (Dimensions)

### Současný stav
- Nejpropracovanější krok ✓
- Živý náhled s proporcionálním měřítkem
- Výpočet objemu + náklady na vodu
- Collapsible tipy k hloubce

### UX vylepšení
- [ ] Responzivní layout pro mobily (1 sloupec)
- [ ] Warning při extrémních poměrech rozměrů
- [ ] Zvýraznit collapsible "Tipy k hloubce"

### Obsahové vylepšení
- [ ] Přidat doporučené rozměry podle účelu (relaxace vs plavání)
- [ ] Přidat info o minimálních rozměrech pro protiproud

### Schémata
- [ ] Náhled bazénu je kvalitní ✓
- [ ] Přidat indikaci plavecké dráhy při větších rozměrech

---

## Krok 4: Barva (Color)

### Současný stav
- Preview barvy vody s animovanými bublinami
- Swatch + malý preview

### UX vylepšení
- [ ] Responzivní aspect ratio pro preview
- [ ] Respektovat `prefers-reduced-motion` pro bubliny
- [ ] Přidat info že barvy jsou ve stejné cenové kategorii

### Obsahové vylepšení
- [ ] Přidat reálné fotografie bazénů s danou barvou fólie
- [ ] Vysvětlit vliv barvy fólie na barvu vody

### Schémata
- [ ] Preview vody je kvalitní ✓

---

## Krok 5: Schodiště (Stairs)

### Současný stav
- Automatické přeskočení pro kruhové bazény
- Obrázky schodišť
- Tag systém

### UX vylepšení
- [ ] Grid 1-2-3 sloupce (mobile-tablet-desktop)
- [ ] Fallback pro chybějící obrázky
- [ ] Přidat info kolik prostoru schodiště zabere

### Obsahové vylepšení
- [ ] **OVĚŘIT** že všechny obrázky existují
- [ ] Přidat rozměry schodišť
- [ ] Přidat cenové indikátory

### Schémata
- [ ] **OVĚŘIT/DOPLNIT** obrázky všech typů schodišť:
  - [ ] `/images/stairs/roman.png`
  - [ ] `/images/stairs/corner.png`
  - [ ] `/images/stairs/straight.png`
  - [ ] `/images/stairs/none.png`

---

## Krok 6: Technologie (Technology)

### Současný stav
- 3 možnosti: Šachta, Stěna, Jiné
- Ikony (Box, Layers, Home)
- Tag "Doporučeno"

### UX vylepšení
- [ ] **PŘIDAT VIZUALIZACE** rozdílu mezi umístěními
- [ ] Conditional input field pro "Jiné umístění"

### Obsahové vylepšení
- [ ] Vysvětlit výhody/nevýhody každého umístění
- [ ] Přidat prostorové požadavky (rozměry šachty)
- [ ] Přidat cenové indikátory

### Schémata
- [ ] **VYTVOŘIT** diagram technologie v šachtě
- [ ] **VYTVOŘIT** diagram technologie ve stěně
- [ ] **VYTVOŘIT** diagram jiného umístění (sklep, garáž)

---

## Krok 7: Příslušenství (Accessories)

### Současný stav
- 3 kategorie: Osvětlení, Protiproud, Úprava vody
- Info box pro slanou vodu

### UX vylepšení
- [ ] Označit povinné pole (Úprava vody) vizuálně
- [ ] Kompaktnější layout (radio buttons místo velkých karet)
- [ ] Přidat info že lze kombinovat

### Obsahové vylepšení
- [ ] Přidat cenové indikátory ke každé možnosti
- [ ] Přidat technické specifikace (výkon protiproudu, počet LED)
- [ ] Vysvětlit rozdíl chlor vs slaná voda podrobněji

### Schémata
- [ ] Přidat vizualizace umístění světel v bazénu
- [ ] Přidat vizualizaci protiproudu

---

## Krok 8: Vytápění (Heating)

### Současný stav
- 3 možnosti: Bez ohřevu, Příprava, Tepelné čerpadlo
- Conditional info box u tepelného čerpadla

### UX vylepšení
- [ ] AnimatePresence pro info box
- [ ] Přidat cenové indikátory

### Obsahové vylepšení
- [ ] Přidat odhadované provozní náklady
- [ ] Přidat doporučení podle velikosti bazénu
- [ ] Vysvětlit princip tepelného čerpadla

### Schémata
- [ ] Přidat diagram zapojení tepelného čerpadla

---

## Krok 9: Zastřešení (Roofing)

### Současný stav
- 2 možnosti: Bez zastřešení, Se zastřešením
- Conditional benefits box

### UX vylepšení
- [ ] Single column benefits na mobilech
- [ ] Přidat typy zastřešení (nízké/vysoké/posuvné)

### Obsahové vylepšení
- [ ] Přidat cenové rozsahy
- [ ] Přidat fotografie typů zastřešení
- [ ] Vysvětlit požadavky na prostor okolo bazénu

### Schémata
- [ ] **PŘIDAT** fotografie/vizualizace typů zastřešení

---

## Krok 10: Kontakt (Contact)

### Současný stav
- 3 pole: Jméno, Email, Telefon
- Privacy note

### UX vylepšení (KRITICKÉ)
- [ ] **INLINE ERROR MESSAGES** - zobrazit CO je špatně
- [ ] Legend pro povinná pole (`*`)
- [ ] Auto-formátování telefonu
- [ ] Správné ARIA asociace labels s inputy
- [ ] `aria-invalid` a `aria-describedby` pro errory

### Obsahové vylepšení
- [ ] Přidat GDPR souhlas checkbox
- [ ] Přidat možnost poznámky/dotazu
- [ ] Přidat preferovaný čas kontaktování

### Schémata
- N/A (formulářový krok)

---

## Krok 11: Shrnutí (Summary)

### Současný stav
- Kompletní přehled voleb
- Success animace
- "Co bude následovat" timeline
- Tlačítka Upravit/Nová konfigurace

### UX vylepšení
- [ ] Collapsible sekce na mobilech
- [ ] **EDIT IKONY** u každé položky pro rychlou navigaci
- [ ] Lepší integrace Turnstile widgetu

### Obsahové vylepšení
- [ ] Přidat odhadovaný cenový rozsah (pokud je možné)
- [ ] Přidat estimated delivery time
- [ ] Přidat kontaktní informace Rentmil

### Schémata
- N/A (sumární krok)

---

## Globální komponenty

### Navigace (ConfiguratorNavigation)
- [ ] **STICKY BOTTOM** na mobilech
- [ ] Tooltip na disabled "Další" tlačítko
- [ ] Skrýt "Zpět" na prvním kroku

### Progress Bar (ConfiguratorProgress)
- [ ] Hover efekt na klikatelné kroky
- [ ] Expandable step list na mobilech

### Step Layout (StepLayout)
- [ ] Výraznější focus indicators (ring-4)
- [ ] Memoizace screen reader announcements

### Option Card
- [ ] Větší touch targets (min 44x44px)
- [ ] Focus-visible states

---

## Vizuální konzistence tvarů bazénu

### Problém
Napříč konfigurátorem je potřeba sjednotit vizuální reprezentaci 3 tvarů bazénu tak, aby byly **jednoznačně rozpoznatelné**:
1. **Kruh** (`circle`)
2. **Obdélník se zaoblenými rohy** (`rectangle_rounded`)
3. **Obdélník s ostrými rohy** (`rectangle_sharp`)

### Kde se tvary zobrazují

| Místo | Soubor | Současný stav |
|-------|--------|---------------|
| Krok 1 - výběr tvaru | `step-shape.tsx` | SVG s animací vody |
| Krok 3 - náhled rozměrů | `step-dimensions.tsx` | Dynamický SVG náhled |
| Krok 5 - schodiště | `step-stairs.tsx` | Obrázky schodišť (bez kontextu tvaru) |
| Krok 11 - shrnutí | `step-summary.tsx` | Pouze text |
| Admin - konfigurace | `admin/konfigurace/` | Pouze text |

### Požadavky na sjednocení

#### 1. Jednotný vizuální jazyk
- [ ] Všechny tvary musí používat **stejný vizuální styl**
- [ ] Jasně rozlišitelné proporce:
  - Kruh: poměr 1:1
  - Obdélník zaoblený: poměr 2:1, radius rohů 20%
  - Obdélník ostrý: poměr 2:1, radius rohů 0
- [ ] Konzistentní barvy a styly čar

#### 2. Tvary k vytvoření/sjednocení
- [ ] **SVG ikony** pro použití v UI (32x32, 48x48)
  - `/public/images/pool-shapes/circle-icon.svg`
  - `/public/images/pool-shapes/rectangle-rounded-icon.svg`
  - `/public/images/pool-shapes/rectangle-sharp-icon.svg`
- [ ] **SVG náhledy** pro karty v kroku 1 (se efektem vody)
- [ ] **SVG schémata** pro technické zobrazení (rozměry, schodiště)

#### 3. Místa k aktualizaci
- [ ] `step-shape.tsx` - hlavní výběr tvaru
- [ ] `step-dimensions.tsx` - náhled s rozměry (PoolPreview komponenta)
- [ ] `step-stairs.tsx` - přidat kontext tvaru bazénu k obrázkům schodišť
- [ ] `step-summary.tsx` - přidat malou ikonu tvaru
- [ ] Konstanty v `configurator.ts` - přidat `iconPath` ke každému tvaru

#### 4. Specifikace vizuálního stylu

```
Společné vlastnosti:
- Obrys: 2px stroke, barva #48A9A6 (Rentmil Water)
- Výplň: gradient od #48A9A6/10 do #48A9A6/30
- Stín: subtle drop shadow

Kruh:
- Perfektní kruh (cx=cy, r jednotný)
- Žádné další prvky

Obdélník zaoblený:
- Poměr stran přibližně 2:1 (např. 100x50)
- Border-radius: 20% z kratší strany
- Jemně zaoblené rohy

Obdélník ostrý:
- Poměr stran přibližně 2:1 (např. 100x50)
- Border-radius: 0 (ostré rohy 90°)
- Čisté geometrické linie
```

---

## Prioritizace implementace

### Fáze 0: Vizuální sjednocení tvarů (PRVNÍ)
1. Vytvořit sadu konzistentních SVG ikon pro 3 tvary
2. Aktualizovat krok 1 (Shape) s novými vizuály
3. Sjednotit náhled v kroku 3 (Dimensions)
4. Přidat ikony tvarů do shrnutí (krok 11)

### Fáze 1: Kritické (IHNED)
1. Krok 10: Inline error messages
2. Navigace: Sticky bottom na mobilech
3. Krok 10: Vizuální indikace povinných polí
4. Focus indicators pro keyboard navigation

### Fáze 2: Vysoká priorita
1. Krok 2: SVG diagramy skimmer vs overflow
2. Krok 5: Ověřit obrázky schodišť + přidat kontext tvaru
3. Krok 6: Vizualizace umístění technologie
4. Krok 11: Edit links u položek
5. Accessibility audit a opravy

### Fáze 3: Střední priorita
1. Cenové indikátory u všech možností
2. Responzivní layouty pro mobily
3. Obsahové vylepšení (texty, popisy)
4. Krok 9: Typy zastřešení

### Fáze 4: Nice-to-have
1. Reálné fotografie (barvy, zastřešení)
2. Progress persistence (draft saving)
3. Help systém
4. A/B testování

---

## Checklist před dokončením každého kroku

- [ ] UX vylepšení implementována
- [ ] Obsahové změny schváleny Rentmil
- [ ] Schémata/obrázky připravena a nahrána
- [ ] Testováno na mobilu
- [ ] Accessibility otestováno
- [ ] Otestováno v embedded módu

---

## Poznámky k implementaci

### Obrázky a schémata
Všechny nové obrázky ukládat do:
- `/public/images/pool-types/` - diagramy typů bazénů
- `/public/images/stairs/` - obrázky schodišť
- `/public/images/technology/` - diagramy technologie
- `/public/images/accessories/` - vizualizace příslušenství
- `/public/images/roofing/` - fotky zastřešení

### Konstanty
Všechny textové změny v:
- `src/lib/constants/configurator.ts`

### Komponenty
- `src/components/configurator/steps/` - jednotlivé kroky
- `src/components/configurator/` - sdílené komponenty

---

*Plán vytvořen na základě UX analýzy z 29. prosince 2025*
