# Tracking rozpracovaných (nedokončených) konfigurací

**Datum:** 2026-05-21
**Typ:** Nová feature (fáze 2 optimalizace konfigurátoru)
**Umístění:** veřejný konfigurátor (krok 10→11) + `/admin/konfigurace` + e-mail (Resend)
**Mockupy:** `public/mockup/konfigurator/email-pripominka.html`, `public/mockup/konfigurator/admin-drafty.html`

## Cíl

Zachytit poptávky lidí, kteří v konfigurátoru vyplní kontaktní údaje, ale poptávku
neodešlou. Dnes se konfigurace ukládá do DB **až při odeslání** — kdo dojde do kroku 11
a neklikne na „Získat kalkulaci zdarma", zmizí beze stopy. Podle dat marketingu to je
většina návštěvníků (z 20 lidí v posledním kroku odeslali 2).

Po nasazení:

- Rozpracovaná konfigurace s kontaktem se uloží jako **draft** v okamžiku přechodu z kroku 10.
- Po ~2 h bez odeslání dostane uživatel **připomínkový e-mail** s odkazem zpět.
- Admin/marketing vidí v `/admin/konfigurace` seznam rozpracovaných + **konverzní poměr**.

## Proč

- **Vytěžení existujícího provozu** — fáze 1 zvedá konverzi UI úpravami; fáze 2 dává druhou
  šanci těm, co i tak odejdou.
- **Odpověď na dotaz marketingu** „kolik poptávek a jaká konverze" — dnes není měřitelné
  uvnitř aplikace, jen v GA4.
- **Podklad pro obchodníka** — detail rozpracované konfigurace umožní proaktivní hovor.

## Současný stav (co se mění)

| Oblast | Dnes | Po změně |
|---|---|---|
| Uložení do DB | jen při odeslání (`submitConfiguration`) | draft už při přechodu z kroku 10 |
| Kontakt | persistuje se jen v paměti, ne do localStorage ani DB | draft uložen v DB; localStorage beze změny |
| Pipedrive deal + e-mail | vzniká při odeslání | beze změny — vzniká **až** při odeslání draftu (CRM se nezaplní low-intent leady) |
| Admin seznam | jen odeslané konfigurace | + rozpracované, filtr stavu, statistiky |

## Datový model — migrace

Tabulka `configurations` už má sloupec `status` (`ConfigurationStatus = 'new' | 'processed'`),
ten ale řeší **admin workflow po odeslání** — nepřetěžovat ho. Přidáme samostatné sloupce.

Nová migrace `supabase/migrations/20260521000001_configuration_drafts.sql`:

```sql
ALTER TABLE configurations
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_email_id TEXT,
  ADD COLUMN IF NOT EXISTS reminder_scheduled_at TIMESTAMPTZ;

-- index pro admin filtr rozpracovaných
CREATE INDEX IF NOT EXISTS configurations_is_draft_idx
  ON configurations (is_draft);
```

- Existující řádky = `is_draft = FALSE` (byly odeslané) — default to zařídí.
- `reminder_email_id` — ID naplánovaného e-mailu v Resendu (handle pro zrušení); `NULL`,
  pokud se naplánovat nepodařilo.
- `reminder_scheduled_at` — kdy má připomínka odejít (pro zobrazení v adminu).

**Typy** (`src/lib/supabase/types.ts`): doplnit `is_draft`, `reminder_email_id`,
`reminder_scheduled_at` do `configurations` `Row` / `Insert` / `Update`. Konfigurace je
„database-extracted" typ — držet se vzoru.

## Tok konfigurátoru — kdy se draft ukládá

### Identifikace draftu napříč session

Do Zustand store (`configurator-store.ts`) přidat `draftId: string | null` a zařadit ho do
`partialize` (není to PII, jen UUID) — přežije reload. Kontakt se do localStorage **nadále
nepersistuje**.

### Kdy se volá uložení

Draft se ukládá při **přechodu z kroku 10 na krok 11** (`nextStep()` z kroku 10), pokud je
kontakt validní (`canProceed(10) === true`). Ne při psaní do políček (žádné průběžné ukládání
nedopsaného e-mailu).

Server action `saveDraftConfiguration`:

1. Nemá `draftId` → `INSERT` řádku s `is_draft = TRUE`, `source = 'web'`,
   `pipedrive_status = 'pending'`. Pak **naplánuje připomínkový e-mail v Resendu**
   (`scheduledAt` = +2 h), uloží vrácené `reminder_email_id` + `reminder_scheduled_at`
   na řádek. Vrátí `id` → uloží se do store.
2. Má `draftId` → `UPDATE` řádku. Konfigurace se mohla změnit (návrat na krok 10), proto
   **zrušit starý naplánovaný e-mail** (`resend.emails.cancel`) a naplánovat nový
   s aktuálními daty.
3. Selhání (síť, DB, Resend) → tiše ignorovat, nesmí blokovat průchod wizardem. Bez
   `draftId` se na finále spadne do dnešní `INSERT` větve.

Volání je **fire-and-forget** — nedrží navigaci, nezobrazuje chybu uživateli.

## Server actions — úprava odesílacího flow

`submitConfiguration` (`src/app/actions/submit-configuration.ts`) dostane volitelný
`draftId`:

- **S `draftId`:** místo `INSERT` se draft `UPDATE`-ne — `is_draft = FALSE` + ostatní pole
  z formuláře (pro jistotu přepsat, kdyby uživatel mezi krokem 10 a 11 šel zpět a měnil).
  **Zruší se naplánovaná připomínka** (`resend.emails.cancel(reminder_email_id)`) — uživatel
  poptávku dokončil, připomínku už nepotřebuje. Pak proběhne Pipedrive + potvrzovací
  e-mail jako dnes.
- **Bez `draftId`:** beze změny — dnešní `INSERT` (`is_draft` zůstane default `FALSE`).

**Idempotency:** kontrola duplicit (`existingConfig` dotaz na `idempotency_key`) musí nově
filtrovat `is_draft = FALSE` — jinak by se jako „duplicita" tvářil vlastní draft daného
uživatele. Stejně tak ošetřit `INSERT` draftu při kolizi na unikátním `idempotency_key`
(uživatel se stejnou konfigurací podruhé) — `ON CONFLICT` → najít a vrátit existující draft.

Nová server action `saveDraftConfiguration` v `src/app/actions/` (vedle
`submit-configuration.ts`): rate limit jako u submitu, **bez** Turnstile (draft není citlivá
akce a Turnstile widget je až v kroku 11), `validateCsrf()`.

## Připomínkový e-mail (Resend scheduling)

**Žádný cron není potřeba.** Resend umí e-mail naplánovat na budoucí čas (parametr
`scheduledAt`) a naplánovaný e-mail zase zrušit (`emails.cancel`). Připomínku proto
naplánujeme rovnou při vzniku draftu a zrušíme ji při odeslání poptávky — odpadá
celá cron infrastruktura (`/api/cron/...`, `CRON_SECRET`, Railway cron).

### Rozšíření e-mailového klienta

`sendEmail` (`src/lib/email/client.ts`) dostane volitelný parametr `scheduledAt`
(předá se do `resend.emails.send`). Vrácené `messageId` je handle pro pozdější zrušení.
Doplnit tenký wrapper `cancelScheduledEmail(id)` nad `resend.emails.cancel`.

### E-mailová šablona

Nová šablona `src/lib/email/templates/configuration-reminder.ts` (vedle
`configuration-confirmation.ts`). Obsah dle mockupu `email-pripominka.html`:

- Předmět: „Skoro hotovo — váš bazén na vás čeká"
- Maskot, krátké shrnutí konfigurace, CTA **„Dokončit a získat kalkulaci"**.
- Odkaz vede na konfigurátor s parametrem `?draft=<id>` (viz níže).
- **Reply-to:** `bazeny@rentmil.cz` (stejně jako u potvrzovacího e-mailu) — pokud
  zákazník na připomínku odpoví, odpověď chodí sem.
- Patička: odkaz „Nezasílat připomínky" + zásady ochrany OÚ.

### Životní cyklus připomínky

1. Draft vznikne (krok 10→11) → `sendEmail({ ..., scheduledAt: +2 h })`, uloží se
   `reminder_email_id` + `reminder_scheduled_at` na řádek.
2. Draft se aktualizuje (návrat na krok 10) → zrušit starý naplánovaný e-mail
   a naplánovat nový s aktuálními daty.
3. Poptávka odeslána → `cancelScheduledEmail(reminder_email_id)`, připomínka nedorazí.
4. Draft neodeslán → Resend e-mail v naplánovaný čas sám odešle. Žádná naše akce.

> **Pozor na race condition:** pokud uživatel odešle poptávku v posledních vteřinách
> před naplánovaným časem, `cancel` už nemusí stihnout — připomínka dorazí i tak.
> Akceptovatelné; e-mail je formulován tak, aby nevadil ani odeslané poptávce.

### Obnovení draftu z odkazu (`?draft=<id>`)

Konfigurátor při startu zkontroluje query param `draft`, načte konfiguraci z DB
(server action / API), **plně předvyplní store včetně kontaktu** a skočí na krok 11.
Bez parametru beze změny.

## Admin přehled

`/admin/konfigurace` (seznam) — dle mockupu `admin-drafty.html`. Přístup mají
**všichni přihlášení uživatelé** (role `user` i `admin`) — `/admin/konfigurace` není
admin-only, žádná role gate se nepřidává:

- **Filtr stavu** rozšířit o „Rozpracované" / „Odeslané" (existující status filtr je
  `new`/`processed`; přidat osu draft/submitted — buď nový segment, nebo druhý filtr).
- Sloupec/badge **„Rozpracovaná"** vs **„Odeslaná"** (`is_draft`).
- Sloupec **Připomínka** (`reminder_scheduled_at`: naplánováno na čas / zrušeno po
  odeslání / —).
- **Statistiky** nahoře: počet odeslaných, počet rozpracovaných, konverzní poměr
  (odeslané / všechny s kontaktem), počet dokončených po připomínce.
- Detail rozpracované konfigurace — read-only náhled pro obchodníka (proaktivní hovor).
- Sidebar count (`/api/admin/sidebar-counts`) — zvážit, zda rozpracované počítat zvlášť.

## GDPR

**Souhlas dává uživatel vyplněním kontaktních údajů** — žádný samostatný checkbox
(nepřidávat tření do kroku, který právě optimalizujeme).

- Upravit text karty **„Vaše údaje jsou v bezpečí"** v `step-contact.tsx` — doplnit, že
  rozpracovanou konfiguraci ukládáme a můžeme zaslat připomínku k dokončení.
- Aktualizovat **zásady ochrany osobních údajů** na rentmil.cz (mimo tento repozitář —
  úkol pro marketing) — účel zpracování + uložení rozpracovaných poptávek + připomínkový
  e-mail.
- Připomínkový e-mail musí mít funkční **opt-out** odkaz („Nezasílat připomínky").
- Retence: rozpracované konfigurace bez konverze se po **1 měsíci** smažou
  (jednorázový SQL skript nebo malá scheduled funkce).

## Edge cases

- **Draft se neuloží (chyba):** wizard pokračuje, finále spadne do dnešní `INSERT` větve.
- **Uživatel projde 10→11→zpět→10→11:** `saveDraftConfiguration` s existujícím `draftId`
  → `UPDATE`, ne nový řádek.
- **Reset konfigurátoru:** `reset()` vyčistí `draftId` ze store (draft v DB zůstane,
  připomínka časem odejde — to je v pořádku, kontakt byl validně zadán).
- **Duplicitní odeslání:** kontrola idempotency nově ignoruje `is_draft = TRUE` řádky.
- **Uživatel odešle z jiného zařízení / jiné session:** původní draft zůstane
  `is_draft = TRUE` a jeho naplánovaná připomínka v Resendu odejde — submit na druhém
  zařízení nezná `draftId` původního draftu a nemůže ji zrušit. Uživatel tak může dostat
  připomínku, i když poptávku odeslal; e-mail je proto formulován neutrálně. Volitelná
  mitigace: při submitu dohledat starší drafty se stejným `idempotency_key` a jejich
  připomínky zrušit.
- **Embed režim (`/embed`):** draft tracking funguje stejně; ověřit, že `?draft=` prefill
  nekoliduje s embed logikou.

## Rozsah a fáze implementace

**Krok 1 — datový model**
- Migrace `20260521000001_configuration_drafts.sql`, doplnění typů.

**Krok 2 — ukládání draftu**
- `saveDraftConfiguration` server action.
- `draftId` ve store + `partialize`, volání při přechodu 10→11.
- Úprava `submitConfiguration` (větev s `draftId`, idempotency filtr).
- Úprava GDPR textu v `step-contact.tsx`.

**Krok 3 — admin přehled**
- Filtr stavu draft/submitted, badge, sloupec připomínky, statistiky.

**Krok 4 — připomínkový e-mail**
- Rozšíření `sendEmail` o `scheduledAt` + wrapper `cancelScheduledEmail`.
- E-mailová šablona `configuration-reminder.ts`.
- Naplánování připomínky při vzniku draftu, zrušení při odeslání.
- `?draft=` prefill konfigurátoru (lze i jako samostatný dílčí krok).

Kroky 1–3 dávají hodnotu i bez kroku 4 (admin hned vidí rozpracované a konverzi).
Krok 4 lze nasadit zvlášť — bez cronu, jen práce v kódu.

## Rozhodnutí (potvrzeno 2026-05-21)

1. **Timing připomínky** — 1 e-mail, ~2 h po opuštění konfigurátoru.
2. **Prefill z `?draft=`** — plný prefill z DB (konfigurace i kontakt), skok na krok 11.
3. **Retence** — rozpracované konfigurace bez konverze se po 1 měsíci smažou.
4. **Žádná druhá připomínka ani ruční follow-up** — v1 jen jeden připomínkový e-mail.
5. **Reply-to připomínky** — `bazeny@rentmil.cz`.
6. **Viditelnost v adminu** — rozpracované konfigurace vidí všichni přihlášení uživatelé.
7. **Fázování** — kroky 1–3 (migrace, ukládání draftu, admin přehled) se nasadí dřív,
   krok 4 (připomínkový e-mail) potom.
