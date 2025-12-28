# Plán integrace konfigurátoru do WordPress webu rentmil.cz

## Přehled

Cíl: Integrovat Next.js konfigurátor bazénů jako součást WordPress webu rentmil.cz (Elementor) s konzistentním designem a UX.

---

## 1. Technická implementace

### Doporučená varianta: iframe embedding

**Výhody:**
- Úplná izolace stylů - žádné konflikty s WordPress/Elementor CSS
- Nezávislé nasazení a aktualizace konfigurátoru
- Jednoduchá implementace

**Implementace:**

1. **Nová `/embed` route v Next.js** - speciální endpoint pro embedding
2. **WordPress shortcode** - `[rentmil_konfigurator]` pro vložení do stránky
3. **PostMessage API** - pro komunikaci mezi iframe a rodičovským oknem (resize, tracking)

### Alternativní varianta: Subdoména

Konfigurátor na `konfigurator.rentmil.cz` s konzistentním stylem a odkazem zpět na hlavní web.

---

## 2. UX/CX změny pro embedded mód

### Prvky k odstranění

| Prvek | Důvod |
|-------|-------|
| Header s logem | WordPress web má vlastní navigaci a logo |
| Dekorativní pozadí (gradient blur circles) | Čistší integrace do stránky |
| Footer maskot | Zjednodušení pro embedded kontext |

### Prvky k zachování

| Prvek | Důvod |
|-------|-------|
| Progress bar | Klíčový navigační prvek |
| Summary sidebar/panel | Důležitý pro UX |
| Maskot v sidebaru | Volitelně - brandový prvek |
| Mobile bottom bar | Klíčové pro mobilní UX |

### Nové navigační prvky (volitelné)

- Breadcrumb: `Úvodní stránka > Bazénové centrum > Konfigurátor`
- "Zavolat nám" tlačítko na mobilu

---

## 3. Designové změny

### 3.1 Barevné úpravy

**Aktuální stav:** Konfigurátor již používá brandové barvy Rentmil ✓

| Barva | Hex | Použití |
|-------|-----|---------|
| Rentmil Blue | `#01384B` | Texty, dark elementy |
| Rentmil Water | `#48A9A6` | Selection, vodní téma |
| Rentmil Orange | `#FF8621` | CTA tlačítka |
| Rentmil Pink | `#ED6663` | Akcenty |

**Navrhované změny:**

1. **Primary navigační tlačítka** - změnit z modré na oranžovou (`#FF8620`) pro konzistenci s rentmil.cz
2. **Final submit** - již oranžový ✓

### 3.2 Border-radius

**Rentmil.cz používá:** 30px zaoblení

**Návrh:**
- Karty: zvýšit z `rounded-2xl` (16px) na `rounded-3xl` (24px)
- Tlačítka: `rounded-full` nebo `rounded-xl`
- Global `--radius`: zvýšit z `0.75rem` na `1.5rem`

### 3.3 Stíny

**Rentmil.cz:** Subtilní stíny

**Návrh:** Zjemnit stíny
- `shadow-xl` → `shadow-lg`
- `shadow-lg` → `shadow-md`

### 3.4 Pozadí (embedded mód)

```
Aktuálně: bg-gradient-to-br from-slate-50 via-white to-[#48A9A6]/5
Embedded: bg-white nebo bg-[#f8f9fa]
```

### 3.5 Fonty

**Shoda:** Oba používají Nunito Sans ✓

---

## 4. Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/app/embed/page.tsx` | **NOVÝ** - embed route |
| `src/components/configurator/configurator-wrapper.tsx` | Přidat `embedded` prop |
| `src/app/globals.css` | Zvýšit `--radius`, přidat embedded styly |
| `src/components/configurator/step-navigation.tsx` | Změnit barvu primary button |
| WordPress plugin | **NOVÝ** - shortcode pro iframe |

---

## 5. Implementační fáze

### Fáze 1: Embedded mód (priorita)
- [ ] Vytvořit `/embed` route
- [ ] Přidat `embedded` prop do ConfiguratorWrapper
- [ ] Podmíněně skrýt header, footer dekorace, gradient pozadí
- [ ] Nastavit bílé/neutrální pozadí pro embed

### Fáze 2: Designové úpravy
- [ ] Zvýšit border-radius na 24px
- [ ] Změnit primary button na oranžovou
- [ ] Zjemnit stíny
- [ ] Otestovat vizuální konzistenci

### Fáze 3: WordPress integrace
- [ ] Vytvořit shortcode plugin nebo Elementor widget
- [ ] Nastavit správnou výšku iframe
- [ ] Testovat responzivitu na různých zařízeních

### Fáze 4: Komunikace parent-iframe (volitelné)
- [ ] PostMessage pro auto-resize iframe
- [ ] Sdílení tracking events (GA)
- [ ] Předávání UTM parametrů

---

## 6. Příklad kódu

### Embedded route (`/src/app/embed/page.tsx`)
```tsx
import { ConfiguratorWrapper } from "@/components/configurator"

export default function EmbedPage() {
  return <ConfiguratorWrapper embedded />
}
```

### ConfiguratorWrapper úprava
```tsx
interface ConfiguratorWrapperProps {
  embedded?: boolean
}

export function ConfiguratorWrapper({ embedded = false }: ConfiguratorWrapperProps) {
  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden",
      embedded ? "bg-white" : "bg-gradient-to-br from-slate-50 via-white to-[#48A9A6]/5"
    )}>
      {/* Dekorativní pozadí - pouze standalone */}
      {!embedded && (
        <>{/* blur circles */}</>
      )}

      {/* Header - pouze standalone */}
      {!embedded && (
        <header>{/* ... */}</header>
      )}

      {/* Progress bar - vždy */}
      <ConfiguratorProgress />

      {/* Obsah - vždy */}
      {/* ... */}
    </div>
  )
}
```

### WordPress shortcode
```php
function rentmil_configurator_shortcode($atts) {
    $atts = shortcode_atts(['height' => '100vh'], $atts);

    return '<iframe
        src="https://konfigurator.rentmil.cz/embed"
        width="100%"
        height="' . esc_attr($atts['height']) . '"
        frameborder="0"
        style="min-height: 800px; border: none;"
        loading="lazy"
    ></iframe>';
}
add_shortcode('rentmil_konfigurator', 'rentmil_configurator_shortcode');
```

---

## 7. Otázky k rozhodnutí

1. **Primary button barva:** Změnit navigační tlačítka z modré na oranžovou?
2. **Maskot v sidebaru:** Zachovat nebo odstranit v embedded módu?
3. **Breadcrumb navigace:** Přidat do embedded verze?
4. **Subdoména:** Potřebujete také standalone verzi na `konfigurator.rentmil.cz`?
