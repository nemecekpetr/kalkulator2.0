# Rentmil Konfigurátor - Návod k nasazení

## Přehled služeb

| Služba | Účel | Cena |
|--------|------|------|
| Supabase | Databáze + Auth | Zdarma (do 500MB) |
| Cloudflare Turnstile | Anti-spam CAPTCHA | Zdarma |
| Upstash Redis | Rate limiting | Zdarma (do 10k req/den) |
| Vercel | Hosting | Zdarma (hobby) |

---

## Krok 1: Supabase (10 min)

### 1.1 Vytvoření projektu
1. Jdi na https://supabase.com → "Start your project"
2. Přihlas se přes GitHub
3. Klikni "New Project"
4. Vyplň:
   - **Name:** `rentmil-konfigurator`
   - **Database Password:** vygeneruj a ULOŽ SI HO
   - **Region:** Frankfurt (eu-central-1)
5. Počkej 2 minuty na vytvoření

### 1.2 Spuštění SQL migrace
1. V Supabase dashboardu jdi do **SQL Editor**
2. Klikni "New query"
3. Zkopíruj obsah souboru `supabase/migrations/20231223000000_initial_schema.sql`
4. Klikni "Run"
5. Mělo by se zobrazit "Success"

### 1.3 Vytvoření admin uživatele
1. Jdi do **Authentication → Users**
2. Klikni "Add user" → "Create new user"
3. Vyplň email a heslo pro admin přístup
4. Zaškrtni "Auto Confirm User"

### 1.4 Získání API klíčů
1. Jdi do **Settings → API**
2. Zkopíruj si:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## Krok 2: Cloudflare Turnstile (5 min)

1. Jdi na https://dash.cloudflare.com/sign-up
2. Vytvoř účet (nepotřebuješ přidávat doménu)
3. V menu vlevo klikni na **Turnstile**
4. Klikni "Add site"
5. Vyplň:
   - **Site name:** `rentmil-konfigurator`
   - **Hostname:** `localhost` (pro vývoj)
   - **Widget Mode:** Managed
6. Klikni "Create"
7. Zkopíruj si:
   - `Site Key` → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `Secret Key` → `TURNSTILE_SECRET_KEY`

**Poznámka:** Po nasazení na Vercel přidej další hostname (např. `konfigurator.rentmil.cz`)

---

## Krok 3: Upstash Redis (5 min)

1. Jdi na https://console.upstash.com
2. Přihlas se přes GitHub
3. Klikni "Create Database"
4. Vyplň:
   - **Name:** `rentmil-ratelimit`
   - **Type:** Regional
   - **Region:** EU-West-1 (Ireland)
5. Klikni "Create"
6. V záložce "REST API" zkopíruj:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Krok 4: Lokální nastavení

```bash
# Zkopíruj šablonu
cp .env.local.example .env.local

# Uprav .env.local a vyplň všechny hodnoty
```

---

## Krok 5: Vercel nasazení (10 min)

### 5.1 Push do GitHubu
```bash
# Inicializuj Git (pokud ještě není)
git init
git add .
git commit -m "Initial commit"

# Vytvoř repo na GitHubu a pushni
git remote add origin https://github.com/tvuj-username/rentmil-konfigurator.git
git push -u origin main
```

### 5.2 Import do Vercelu
1. Jdi na https://vercel.com
2. Klikni "Add New..." → "Project"
3. Vyber svůj GitHub repo
4. V "Environment Variables" přidej VŠECHNY proměnné z `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_APP_URL` (nastav na Vercel URL, např. `https://rentmil-konfigurator.vercel.app`)
5. Klikni "Deploy"

### 5.3 Po nasazení
1. Zkopíruj Vercel URL (např. `https://rentmil-konfigurator.vercel.app`)
2. Aktualizuj `NEXT_PUBLIC_APP_URL` v Vercel Environment Variables
3. Přidej tuto URL do Cloudflare Turnstile jako další hostname

---

## Krok 6: Testování

1. Otevři Vercel URL
2. Projdi konfigurátor až na konec
3. Odešli testovací poptávku
4. Zkontroluj v Supabase → Table Editor → configurations

---

## Volitelné: Make.com integrace (Pipedrive)

Pokud chceš propojit s Pipedrive:

1. Vytvoř scénář v Make.com
2. Přidej "Webhook" trigger
3. Zkopíruj webhook URL do `MAKE_WEBHOOK_URL`
4. Nastav `MAKE_CALLBACK_SECRET` na náhodný řetězec
5. Přidej tento secret do Make.com scénáře pro callback

---

## Troubleshooting

### Chyba "supabaseUrl is required"
- Zkontroluj, že všechny Supabase env proměnné jsou správně nastavené v Vercelu

### Turnstile se nezobrazuje
- Zkontroluj, že hostname je přidaný v Cloudflare Turnstile nastavení

### Rate limit nefunguje
- Zkontroluj Upstash credentials
- Zkontroluj, že Redis databáze je v EU regionu

---

## Kontakt

V případě problémů kontaktuj vývojáře.
