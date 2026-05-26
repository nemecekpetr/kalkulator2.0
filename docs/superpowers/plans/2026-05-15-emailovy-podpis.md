# Generátor emailových podpisů pro pracovníky Rentmilu

**Datum:** 2026-05-15
**Typ:** Nová feature
**Umístění:** `/admin/profil` (podpis) + `/admin/nastaveni/email-bannery` (knihovna bannerů)

## Cíl

Dát každému pracovníkovi Rentmilu možnost vygenerovat si svůj emailový podpis v jednotném brand stylu Rentmilu. Pracovník v admin panelu vyplní pozici, vybere šablonu (s bannerem / bez banneru) a v případě bannerové šablony si vybere konkrétní banner z knihovny sezónních kampaní. Jedním kliknutím zkopíruje HTML podpis do schránky.

Souběžně vzniká **knihovna sezónních bannerů** — admin/uživatel uploadne PNG/JPG bannery k aktuálním kampaním (zazimování, jarní zprovoznění, sleva, novinka). Bannery se kumulují v knihovně a každý rok se sezónně recyklují bez nutnosti znovu nahrávat.

## Proč

- **Brand konzistence v podpisech** — dnes každý pracovník posílá emaily v jiném formátu.
- **CTA v každém odchozím emailu** — sezónní banner s odkazem se stává marketingovým kanálem v každé komunikaci.
- **Sezónní recyklace bez znovu-tvorby** — banner z loňského zazimování se příští sezónu jen reaktivuje, nemusí se vyrábět znovu.
- **UTM tracking** — všechny odkazy v podpisech (logo, banner, evergreen CTA) automaticky dostanou UTM parametry, marketing pak v GA vidí, kolik prokliků přišlo z podpisů.
- **Žádný nový login, žádný nový tool** — pracovníci už v admin panelu jsou.

## Uživatelský tok

### Pracovník — generování svého podpisu (`/admin/profil`)

1. Otevře `/admin/profil`.
2. Vidí pod existujícími kartami novou kartu **„Emailový podpis"**.
3. Karta obsahuje:
   - Pole **„Pozice"** (např. „Bazénový specialista") — editovatelné kdykoliv, ukládá se do `user_profiles.position`. Pole je viditelné i v kartě „Osobní údaje".
   - Radio výběr šablony: **„S bannerem"** (default) / **„Kompaktní bez banneru"**.
   - Pokud „S bannerem": **dropdown / grid bannerů z knihovny** — pracovník vybere konkrétní (Zazimování 2026, Jarní akce, Vánoční sleva…). Pokud nevybere žádný, použije se evergreen banner („Spočítejte si bazén zdarma → konfigurátor").
   - **Živý náhled** vybrané šablony se skutečnými údaji (jméno z profilu, vyplněná pozice, email, telefon, zvolený banner).
   - Tlačítko **„Zkopírovat HTML"** (primární CTA).
   - Tlačítko **„Stáhnout .htm"** (sekundární, pro Outlook desktop).
   - Rozbalovací návod **„Jak vložit podpis do Gmailu / Outlooku / Apple Mailu"**.
4. Volba šablony a banneru se ukládá automaticky (debounced) do `user_profiles`.

### Pracovník — správa knihovny bannerů (`/admin/nastaveni/email-bannery`)

Přístup mají **všichni přihlášení uživatelé** (role `admin` i `user`) — ne jen admini. Malá firma, všichni rozumí kampaním.

1. Otevře `/admin/nastaveni/email-bannery`.
2. Vidí seznam všech bannerů v knihovně (grid s náhledy).
3. Může:
   - **Nahrát nový banner** — modal s upload polem (PNG/JPG, max 200 KB), polem „Název" („Zazimování 2026"), polem „URL odkazu" („https://rentmil.cz/zazimovani"), checkboxem „Označit jako evergreen" (volitelné).
   - **Editovat existující banner** — název, URL, sort_order, evergreen flag, znovu uploadnout obrázek.
   - **Smazat banner** — soft delete by stačil, ale doporučuji hard delete s konfirmačním dialogem (uživatelé, kteří banner měli vybraný, automaticky fallnou na evergreen).
4. Jeden banner v celé knihovně může být označen jako **evergreen** (default, pokud pracovník nevybere konkrétní). Při nastavení nového evergreenu se z předchozího evergreen flag odebere.

## Dvě šablony — návrh

Obě šablony pracují s brand barvami (`#01384B`, `#48A9A6`, gradient `#FF8621 → #ED6663` v evergreen banneru), font fallback `Arial, sans-serif`.

### Šablona 1: S bannerem (default)

```
[Logo Rentmil 600×424 → zobrazeno 200×141]

Jan Novák
Bazénový specialista

📧 jan@rentmil.cz   📱 +420 777 123 456

────────────────────────────────────────
Vy zenujete, my bazénujeme.

[Banner 1200×300 → zobrazeno 600×150]
   ↓ (proklik na link_url banneru)
```

- Logo nahoře, kontaktní údaje uprostřed, slogan + banner dole.
- Banner odkazuje na URL nastavenou v knihovně bannerů.
- Pokud pracovník banner nevybral, použije se evergreen.

### Šablona 2: Kompaktní bez banneru

```
Jan Novák | Bazénový specialista | Rentmil
📧 jan@rentmil.cz · 📱 +420 777 123 456 · rentmil.cz
Vy zenujete, my bazénujeme.
```

- Bez loga, bez banneru, jen text.
- Vhodná pro krátké emaily, follow-upy, interní komunikaci.
- Odkaz na `rentmil.cz` (s UTM) v textu.

## Datový model

### Rozšíření `user_profiles`

Tři nové sloupce:

- `position text` — pozice pracovníka („Bazénový specialista").
- `signature_template text` — `'banner'` (default) | `'compact'`.
- `signature_banner_id uuid` — FK na `signature_banners`. Pokud `null`, použije se evergreen banner.

### Nová tabulka `signature_banners`

```sql
create table signature_banners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,                    -- "Zazimování 2026"
  image_url text not null,               -- URL v Supabase Storage
  link_url text not null,                -- kam banner odkazuje
  is_evergreen boolean default false not null,
  sort_order int default 0 not null,
  created_by uuid references user_profiles(id) on delete set null
);

-- Pouze jeden evergreen banner v celé tabulce
create unique index signature_banners_evergreen_unique
  on signature_banners (is_evergreen)
  where is_evergreen = true;
```

### Migrace

```sql
-- supabase/migrations/20260515000001_email_signature.sql

alter table user_profiles
  add column position text,
  add column signature_template text default 'banner',
  add column signature_banner_id uuid;

create table signature_banners (...);

alter table user_profiles
  add constraint user_profiles_signature_banner_fk
  foreign key (signature_banner_id)
  references signature_banners(id)
  on delete set null;

create unique index signature_banners_evergreen_unique
  on signature_banners (is_evergreen)
  where is_evergreen = true;
```

### Supabase Storage

Nový bucket **`signature-banners`**, public read (banner musí být dosažitelný z emailu odkudkoliv bez auth). Insert/update/delete přes service role (server actions).

Konvence pojmenování souborů: `<uuid>.<ext>` (uuid generován při uploadu, ne přejímán z `signature_banners.id`).

## UTM parametry

Všechny odkazy v podpisu (logo, banner, evergreen CTA, textový odkaz `rentmil.cz` v kompaktní šabloně) dostávají automaticky:

```
?utm_source=email&utm_medium=signature&utm_campaign=<slug>
```

`<slug>` určuje:
- **Banner s vlastní URL** → `utm_campaign=banner-<sanitized-name>` (např. `banner-zazimovani-2026`).
- **Evergreen banner** → `utm_campaign=evergreen`.
- **Logo / textový odkaz na rentmil.cz** → `utm_campaign=brand`.

Implementace v helperu `appendUtm(url, campaign)` v `src/lib/email/utm.ts`.

## Logo a brand assets

V repu máme `public/logo-orange-gradient.svg`. Pro email **musíme PNG** (Gmail/Outlook SVG nepodporují).

**Logo asset:** `public/logo-email.png` (600×424 px, 76 KB, transparent background, Orange Gradient — Rentmil wordmark v „kapce"). Dodáno uživatelem 2026-05-15.

Hostováno na produkční doméně konfigurátoru — `<doména>/logo-email.png` jako stable URL referenced z HTML podpisu.

Důvod oddělené PNG verze: stávající `logo.png` má nedefinovaný rozměr (může se v budoucnu změnit pro jiné použití), zatímco `logo-email.png` je dedikovaný asset s pevným contractem.

V podpisu se logo renderuje jako `<img width="200" alt="Rentmil" ...>` — výška se dopočítá z poměru stran (~141 px, aspect ~1.41:1). Source 600 px = 3× retina pro display šířky 200 px, dostačující kvalita.

Banner formát: **PNG/JPG, 1200×300 px** (retina, zobrazení 600×150). Admin/uživatel uploadne hotový obrázek v tomto formátu. UI při uploadu kontroluje rozměr a hlásí varování, pokud poměr stran neodpovídá 4:1 (toleruje ±5 %).

## Soubory na úpravu / vytvoření

### Migrace a typy

| Soubor | Co se mění | Rozsah |
|---|---|---|
| `supabase/migrations/20260515000001_email_signature.sql` | Nová migrace — `signature_banners` tabulka, sloupce na `user_profiles`, Storage bucket | ~30 řádků |
| `src/lib/supabase/types.ts` | `UserProfile` + `UserProfileUpdate` rozšířit; nový `SignatureBanner` interface | ~25 řádků |
| `public/logo-email.png` | Nový asset, 240×60 PNG, ≤ 15 KB | — |

### Generování podpisu (knihovna)

| Soubor | Co se mění | Rozsah |
|---|---|---|
| `src/lib/email/signature-templates.ts` | **Nový** — 2 funkce `renderBannerSignature(data)` a `renderCompactSignature(data)` vracející HTML string | ~200 řádků |
| `src/lib/email/utm.ts` | **Nový** — helper `appendUtm(url, campaign)` | ~15 řádků |

### UI — pracovník (profil)

| Soubor | Co se mění | Rozsah |
|---|---|---|
| `src/app/(admin)/admin/profil/page.tsx` | Vložit `<EmailSignatureCard />` pod existující karty | ~5 řádků |
| `src/components/admin/email-signature-card.tsx` | **Nový** — UI sekce s template radio, banner dropdownem, náhledem v iframe, copy/download tlačítky | ~280 řádků |
| `src/components/admin/profile-form.tsx` | Přidat pole „Pozice" | ~10 řádků |
| `src/app/actions/profile-actions.ts` | Rozšířit `updateMyProfile` o `position`, `signature_template`, `signature_banner_id` | ~10 řádků |

### UI — knihovna bannerů

| Soubor | Co se mění | Rozsah |
|---|---|---|
| `src/app/(admin)/admin/nastaveni/email-bannery/page.tsx` | **Nová** — server komponenta listující bannery | ~50 řádků |
| `src/components/admin/email-banner-list.tsx` | **Nová** — grid bannerů s thumbnaily, edit/delete actions | ~150 řádků |
| `src/components/admin/email-banner-dialog.tsx` | **Nová** — modal pro upload/edit banneru (upload, název, URL, evergreen flag) | ~180 řádků |
| `src/app/actions/signature-banners-actions.ts` | **Nová** — CRUD server actions (`createBanner`, `updateBanner`, `deleteBanner`, `listBanners`) | ~120 řádků |
| `src/components/admin/admin-sidebar.tsx` (či kde žije menu) | Přidat položku „Email bannery" do `/admin/nastaveni/` sekce | ~5 řádků |

**Žádné nové API routy** — vše přes server actions (čistší a stejný pattern jako jiné nastavovací stránky).

## Detaily implementace

### HTML šablony — pravidla pro email kompatibilitu

- **Tabulkový layout** (`<table cellpadding="0" cellspacing="0" border="0">`), žádné flexboxy / gridy.
- **Inline CSS pouze.**
- **Žádné SVG, žádné WebP** — PNG/JPG only.
- **Šířka max 600 px.**
- **Fonty:** `Arial, sans-serif`.
- **Gradient** v evergreen banneru: PNG s gradientem (pre-render), ne CSS gradient (Outlook desktop nezvládá).
- Banner odkaz: `<a href="..."><img ... border="0" style="display:block"></a>` — `display:block` zabraňuje mezerám pod obrázkem v některých klientech.

### Copy-to-clipboard

```ts
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([plainText], { type: 'text/plain' }),
  }),
])
```

Toast: „Podpis zkopírován — vložte ho v nastavení emailu (Cmd+V)".

### Download .htm

Blob s `text/html`, `URL.createObjectURL()`, `<a download="rentmil-podpis.htm">`.

### Náhled v iframe

`<iframe srcDoc={html} sandbox="allow-popups" />` s pevnou výškou, scroll vypnutý. Izolace stylů od Tailwindu admin panelu.

### Upload banneru

Server action `createBanner(formData)`:

1. Validuje soubor (PNG/JPG, ≤ 200 KB, rozměr 1200×300 ±5 %).
2. Uploadne do bucketu `signature-banners` přes service role klienta.
3. Insertne řádek do `signature_banners` s `image_url` = veřejná URL ze Storage.
4. Pokud `is_evergreen = true`, předem unsetne evergreen flag na existujícím evergreen banneru (transakce).

### Validace evergreen flagu

DB constraint `signature_banners_evergreen_unique` (unique partial index) zaručuje konzistenci na úrovni DB. UI to navíc oštří v server action.

## Rozhodnuto

1. **Hard delete banneru** s konfirmačním dialogem („Banner X má vybraných N pracovníků — opravdu smazat?"). Žádný soft delete.
2. **Maximální velikost banner souboru: 200 KB.**
3. **Default evergreen banner při startu** — do seed dat (resp. do migrace) vložit jeden evergreen banner s odkazem na konfigurátor („Spočítejte si bazén zdarma"). Konkrétní artwork dodá uživatel před nasazením.
4. **Pozice uživatele — volný text.** Žádný dropdown s fixními hodnotami.

## Riziko a trade-offy

- **Email klienti se chovají různě** — Gmail, Outlook (web/desktop/mobile), Apple Mail, Seznam.cz Email. Po implementaci nutné testovat odesláním reálného emailu napříč klienty. Náhled v UI nestačí.
- **Změna banneru = uživatelé musí znovu kopírovat** — když admin změní obrázek banneru, již odeslané emaily zůstanou s aktuální verzí (banner je hostovaný na stejné URL). To je **feature, ne bug** — banner v zákazníkově archivu se aktualizuje sám.
- **Smazání banneru = broken image v archivu zákazníků** — pokud admin smaže obrázek z bucketu, již odeslané emaily zobrazí „[broken image]". Doporučuji v dialogu mazání upozornit, ale nezakazovat.
- **Storage bucket public** — kdokoliv s URL banneru ho uvidí. Žádná citlivá data tam nejsou, marketing artwork je veřejný stejně.
- **UTM parametry mohou v Pipedrive vypadat divně** — pokud zákazník klikne na podpisový odkaz a vyplní konfigurátor, do Pipedrive deal note se zapíše URL s UTM. Není problém, jen poznámka.
- **`signature_banners` přístup pro všechny role** — řešíme přes middleware (jakýkoliv přihlášený admin user), žádné RLS. Konzistentní se stávajícím `/admin/nastaveni/*` patternem.

## Akceptační kritéria

### Karta „Emailový podpis" na `/admin/profil`

1. Karta se zobrazí pod kartou „Změna hesla".
2. Obsahuje pole „Pozice" (volný text, ukládá se do `user_profiles.position`).
3. Obsahuje radio s dvěma šablonami — „S bannerem" (default) a „Kompaktní bez banneru".
4. Při zvolené šabloně „S bannerem" se zobrazí dropdown/grid s bannery z knihovny.
5. Pokud uživatel nevybere konkrétní banner, použije se evergreen banner (pokud existuje).
6. Živý náhled v iframe ukazuje aktuální stav podpisu se skutečnými údaji.
7. Tlačítko „Zkopírovat HTML" zkopíruje HTML i plain text variantu do schránky.
8. Tlačítko „Stáhnout .htm" stáhne soubor `rentmil-podpis.htm`.
9. Rozbalovací návod „Jak vložit podpis" se sekcemi pro Gmail / Outlook / Apple Mail.
10. Pole „Pozice" je editovatelné i z karty „Osobní údaje" (zrcadlí stejný field).

### Knihovna bannerů `/admin/nastaveni/email-bannery`

11. Stránka je přístupná jakémukoliv přihlášenému uživateli (role `admin` i `user`).
12. Zobrazuje grid všech bannerů s thumbnaily, názvy, URL, evergreen indikátorem, a sort_order.
13. Tlačítko „Nový banner" otevírá modal s polem upload, název, URL odkazu, evergreen checkbox.
14. Upload validuje typ souboru (PNG/JPG), velikost (≤ 200 KB), rozměr (1200×300 ±5 %).
15. Pouze jeden banner může být označen jako evergreen — při zaškrtnutí se z předchozího evergreen flag odebere.
16. Smazání banneru vyžaduje konfirmaci („Banner X má vybraných N pracovníků — opravdu smazat?").
17. Smazání banneru nastaví `signature_banner_id = NULL` u uživatelů, co ho měli vybraný (cascade FK).

### Generovaný podpis

18. UTM parametry se automaticky doplňují ke všem odkazům (`utm_source=email&utm_medium=signature&utm_campaign=...`).
19. Banner v podpisu odkazuje na `link_url` zapsanou v knihovně.
20. Logo v podpisu odkazuje na `rentmil.cz` (s UTM `campaign=brand`).
21. HTML zkopírovaný a vložený do Gmail compose okna se zobrazí stejně jako v náhledu (logo, banner, formátování, odkazy).

### DB migrace

22. Migrace přidá sloupce `position`, `signature_template`, `signature_banner_id` na `user_profiles` bez breaking change.
23. Migrace vytvoří tabulku `signature_banners` s constraint `unique partial index` na `is_evergreen = true`.
24. Migrace vytvoří Storage bucket `signature-banners` s public read access.

## Rozsah a odhad

- **Frontend:** 1 nová karta v profilu, 1 nová stránka s knihovnou, 1 modal pro upload, 1 mírná úprava profil formuláře.
- **Backend:** 1 migrace, 1 sada server actions (CRUD pro bannery + rozšíření profile actions), Storage bucket setup.
- **Šablony:** 2 HTML email šablony jako TS funkce.
- **Asset:** vyrobit `public/logo-email.png` (240×60 PNG z SVG).
- **Seed:** evergreen banner při prvním deploy.
- **Test:** odeslat testovací emaily do Gmail, Outlook (web + desktop), Apple Mail, Seznam.cz Email.

**Odhad:** 1,5–2 dny vývoje + půl dne testování napříč email klienty + drobná iterace na základě reálného použití.

## Co je explicitně mimo rozsah

- Fotka pracovníka v podpisu.
- Vlastní šablony nahrávané uživatelem (jen výběr ze 2 fixních).
- Verzování podpisů nebo historie změn.
- Plánování bannerů na konkrétní datum (admin uploadne, banner je hned dostupný k výběru).
- Centrální „push" změny podpisu všem pracovníkům (každý si musí znovu zkopírovat, když chce update).
- Měření prokliků z podpisů mimo UTM v GA (žádné vlastní tracking endpointy).
- Integrace s Google Workspace API (centrální nastavení podpisů z dashboardu) — samostatný projekt, pokud někdy bude potřeba.
- Anonymní / sdílené podpisy (např. „info@rentmil.cz") — každý podpis je vázaný na konkrétního pracovníka v `user_profiles`.
