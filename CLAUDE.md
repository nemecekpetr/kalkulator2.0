# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start development server
npm run build            # Production build (also verifies TypeScript types)
npm run lint             # Run ESLint
npm run start            # Start production server
npx supabase db push                    # Apply migrations to remote DB
npx supabase migration new <name>       # Create a new migration file
npx supabase db reset                   # Drop & recreate local DB from migrations
```

No standalone typecheck script — types are only verified at `npm run build`.

### Releases & Changelog

```bash
npm run release          # Create release (bumps version, updates CHANGELOG.md)
npm run release:patch    # Patch release (0.0.x)
npm run release:minor    # Minor release (0.x.0)
npm run release:major    # Major release (x.0.0)
npm run release:first    # First release (0.1.0, no version bump)
npm run changelog:translate  # BROKEN — regex fails. Write userDescription manually in changelog-data.ts.
```

Uses standard-version with conventional commits. Commit format: `feat(scope): message`, `fix(scope): message`.
Git hooks enforce lint (pre-commit) and commit message format (commitlint).

### Data utility scripts

`scripts/` holds one-off TS/JS utilities (run via `tsx` or `node`). One is exposed via npm:

```bash
npm run seed:overflow-sets   # Seed overflow pool sets into the products table
```

Other scripts (`extract-products.ts`, `import-products.ts`, `normalize-products.ts`, `generate-mockup-pdf.cjs`) are run ad-hoc with `tsx scripts/<file>` / `node scripts/<file>` for data imports and asset generation.

## Architecture

This is a pool configurator application for Rentmil (Czech pool manufacturer) built with Next.js 16 App Router, React 19, Tailwind CSS v4, Zod v4, Supabase, and TypeScript.

**Language**: Czech application - UI texts, URL slugs (`/admin/uzivatele`, `/admin/objednavky`), and database values are in Czech.

**Path alias**: `@/*` maps to `./src/*` (e.g., `import { cn } from '@/lib/utils'`)

**Styling**: Tailwind CSS v4 with CSS-based configuration (no `tailwind.config.ts`). Theme tokens and brand colors defined in `src/app/globals.css` via `@theme inline`. Uses `tw-animate-css` for animations.

**Testing**: No test suite is configured. Do not attempt to run tests.

## Brand Guidelines

Plný brandboard: `/graphic/brandboard.pdf` — čti, když píšeš copy nebo navrhuješ vizuály.

**Klíčové body**
- **Koncept**: "Bazénový Zen" — Rentmil prodává bezstarostný režim na zahradě, ne jen bazény. Slogan: *"Vy zenujete, my bazénujeme."* Tagline: *"Rentmil — Bazénový mistr."*
- **Komunikuj**: klid, relaxace, recenze, spokojenost. **Nekomunikuj**: vodní sporty, dětskost.
- **Barvy**: modrá `#01384B`, vodová `#48A9A6`, růžová `#ED6663`, oranžová `#FF8621`. CTA gradient: `#FF8621 → #ED6663`.
- **Typografie**: nadpisy Forma DJR Display, text Nunito Sans.
- **Vizuální styl**: pomalá levitace (jakoby na vodě), osová souměrnost (Wes Anderson), glassmorphism. Maskot "Bazénový mistr" v oranžovém tričku.
- **Assets**: logo `/public/logo-transparent.svg`, maskot `/public/maskot-holding-hq.png` + `/public/maskot-hq.png`, hero `/public/pool-hero.jpg`.

## Data Flow (Lifecycle)

```
Konfigurace → Nabídka → Objednávka → Výroba
(Configuration)  (Quote)    (Order)     (Production)
```

1. Customer submits pool configuration via public wizard
2. Admin creates quote (nabídka) from configuration with line items
3. Accepted quote converts to order (objednávka)
4. Order triggers production tracking (výroba) with checklist

## Core Components

**Public Configurator** (`/`)
- 11-step wizard for customers to configure pool specifications
- State managed via Zustand store (`src/stores/configurator-store.ts`) with persistence
- Steps: 1.Shape > 2.Type > 3.Dimensions > 4.Color > 5.Stairs > 6.Technology > 7.Accessories > 8.Heating > 9.Roofing > 10.Contact > 11.Summary
- Step 5 (Stairs) is automatically skipped for circular pools
- Configuration constants in `src/lib/constants/configurator.ts`
- Storage: Uses localStorage with memory fallback for Safari ITP (`src/lib/storage.ts`)
- Zustand selectors that return an object (multiple fields) MUST be wrapped in `useShallow` — see `useConfiguratorActions` in `src/stores/configurator-store.ts:455`. Without it the store returns a fresh object on every state change and triggers re-renders across the whole tree.

**Embedded Mode** (`/embed`)
- Minimal UI version for iframe embedding in WordPress or other sites
- Access via `/embed` route
- Auto-resizes iframe via postMessage to parent window
- Removes header, decorations, and background styling for seamless integration
- Implementation: `ConfiguratorWrapper` component with `embedded` prop

**Configuration Drafts** (rozpracované konfigurace)
- Captures customers who fill in contact details (step 10) but never submit the quote request
- On the step 10→11 transition, `StepSummary` fires `saveDraftConfiguration` (fire-and-forget) — inserts a `configurations` row with `is_draft = true`, `was_draft = true`
- On submit, `submitConfiguration` *promotes* the matching draft in place (`is_draft → false`) instead of inserting a new row — the draft is found by `draftId` (held in the Zustand store, persisted) or by `idempotency_key`. `was_draft` stays `true` so revived drafts remain distinguishable
- Shared mapping/key helpers in `src/lib/configuration-mapping.ts` (`generateIdempotencyKey`, `buildConfigurationFields`) — used by both the draft and submit actions so the keys always match
- Reminder e-mail is **manual** — staff trigger it from the admin (`draft-admin-actions.ts`), never automatically. Template: `src/lib/email/templates/configuration-reminder.ts`; gender-neutral copy, vocative greeting via `vocativeFirstName`
- Reminder link `?draft=<id>` → `ConfiguratorWrapper` calls `loadDraftConfiguration`, prefills the store via `prefillFromDraft`, jumps to step 11
- Admin: `/admin/konfigurace` has Odeslané / Rozpracované tabs (`?draft=` param), per-row + bulk reminder/delete, conversion stats incl. "Oživené" (drafts submitted after a reminder)
- GDPR: a `pg_cron` job (`anonymize-stale-drafts`, migration `20260521000004`) strips all contact data from unconverted drafts older than 1 month and sets `anonymized_at`; the row + stats flags survive. Anonymized drafts are excluded from the admin list and the "Rozpracované" count

**Configurator Tracking** (`src/lib/analytics/track-configurator.ts`)
- Sends `{ type: 'rentmil_configurator', step, label }` via `window.parent.postMessage` to `https://www.rentmil.cz`
- Fires on mount of steps 1–10, CTA click on step 11 ("Získat kalkulaci"), and "Upravit" click on step 12 (thank-you)
- Parent page (rentmil.cz) consumes events for analytics — listener implemented in GTM
- Silent-fails when no parent window or origin mismatch — tracking must never throw

**Admin Panel** (`/admin/*`)
- Protected routes via Supabase auth middleware (`src/lib/supabase/middleware.ts`)
- Dashboard, configurations management, quotes management, products, user management
- Route groups: `(admin)/admin/` for admin layouts
- `/admin/uzivatele` is admin-only (role check in middleware)
- `/admin/profil`: User profile settings
- `/admin/produkty`: Product catalog with CRUD, bulk operations
- `/admin/produkty/mapovani`: Product mapping rules editor
- `/admin/nastaveni`: Settings hub with sub-pages:
  - `/admin/nastaveni/produkty`: Product settings overview
  - `/admin/nastaveni/produkty/skupiny`: Product groups management
  - `/admin/nastaveni/produkty/precenovani`: Bulk price updates
  - `/admin/nastaveni/produkty/mapovani`: Mapping rules (alternate path)
  - `/admin/nastaveni/uzivatele`: User management
  - `/admin/nastaveni/email-bannery`: Email signature banner library
- `/admin/novinky`: Changelog page showing version history with user-friendly Czech descriptions
- `/admin/profil`: User profile + email signature configuration (template + banner picker)

**Email Signature System**
- Generates per-user HTML email signatures users copy into their mail client
- Per-user settings stored on `user_profiles`: `position`, `signature_template`, `signature_banner_id`
- Banner library in `signature_banners` table — exactly one banner may be `is_evergreen` (enforced by a partial unique index); the evergreen banner is the default fallback
- Banner images live in the public `signature-banners` Supabase Storage bucket; upload/delete via `src/lib/supabase/storage.ts` (admin client, 1 MB max, PNG/JPEG only)
- Rendering: `src/lib/email/signature-templates.ts` produces `{ html, plainText }`. Banner `image_url` may be a path (e.g. `/logo-email.png`) — resolved against `NEXT_PUBLIC_APP_URL`/`baseUrl` at render time so seeded rows stay environment-agnostic
- Banner link URLs get UTM params appended via `src/lib/email/utm.ts` (`appendUtm` never overwrites pre-set UTM params; `sanitizeCampaignSlug` strips diacritics)
- Server actions: `src/app/actions/signature-banners-actions.ts` (banner CRUD), `profile-actions.ts` `updateMyProfile` (partial update — only sends fields that are defined)
- Components: `email-signature-card.tsx` (profile preview), `email-banner-list.tsx` + `email-banner-dialog.tsx` (library admin)

**Quotes System**
- Creates formal quotes from configurations with line items
- Version tracking for quote history
- PDF generation via Puppeteer (HTML-to-PDF) at `/api/admin/quotes/[id]/pdf?quality=email|print`. The `quality` param is forwarded into each print-page URL as a query string (`/quotes/[id]/print?page=…&quality=…`) so the print templates can downscale images. Default is `email`.
- Auto-generation of quote items from configuration via `src/lib/quote-generator.ts`
- Quote variants: Support for multiple pricing tiers (`ekonomicka`, `optimalni`, `premiova`)
- Quote statuses: `draft`, `sent`, `accepted`, `rejected`
- Quote number format: `NAB-XXYYMM` where `XX` = sequential number in month (resets monthly), `YY` = 2-digit year, `MM` = month (e.g., `NAB-010326` = 1st quote in March 2026)
- **Important**: The quote editor (`src/components/admin/quote-editor.tsx`, ~2200 lines) defines a LOCAL `QuoteItem` interface with `variant_keys: QuoteVariantKey[]` that differs from the DB `QuoteItem` which uses `variant_ids: string[]`. Be careful not to confuse them.

**Orders System** (`/admin/objednavky`)
- Created from accepted quotes via status conversion
- Manages customer orders with status tracking
- Order statuses: `created`, `sent`, `in_production`
- Contract fields: fulfillment address, construction/delivery dates, delivery method/cost, VAT rate, weight
- PDF exports generate full purchase agreements with 13 legal articles and signature page

**Production System** (`/admin/vyroba`)
- Tracks pool manufacturing process
- Created from orders, one production per order
- Production statuses: `pending`, `in_progress`, `completed`, `cancelled`
- Includes production checklist items for tracking build progress

**Print Views** (public routes for PDF generation)
- `/quotes/[id]/print`: Quote print view
- `/orders/[id]/print`: Order print view
- `/production/[id]/print`: Production sheet print view

**Product Mapping System**
- Maps configurator choices to products for automatic quote generation
- `ProductMappingRule`: Maps config fields (stairs, technology, heating, etc.) to products
- Pool products are matched by code format: `BAZ-{SHAPE}-{TYPE}-{DIMENSIONS}` (e.g., `BAZ-OBD-SK-3-6-1.2`)
- Set products use code naming: skimmer = `set{N}` (e.g. `set4`, `set65`); overflow = `set{N}-pr` (e.g. `set4-pr`). `SET_DIMENSION_MAP` in `quote-generator.ts` resolves both per `pool_type`.
- Rules support constraints by pool shape and type
- Generated items track their source: `pool_base_price`, `mapping_rule`, `required_surcharge`, or `product_group`

**Product Addon Systems**
- **Skeleton addons**: Addons for `skelety` products that merge into the skeleton item's price and name (inline)
  - Dialog: `src/components/admin/skeleton-addon-dialog.tsx`
- **Set addons**: Addons for `sety` products stored as JSONB array (`set_addons` column on Product)
  - Each addon becomes a separate `QuoteItem` with parent-child relationship
  - Parent-child persisted via `[SA:addonId]` prefix in description field
  - Dialog: `src/components/admin/set-addon-dialog.tsx`
  - Structure: `[{"id": "uuid", "name": "string", "price": number, "sort_order": number}]`

**Status UI Components** (`src/components/admin/status-steps.tsx`)
- `StatusChip`: Compact colored chip showing current status with optional expired-quote warning
- `StatusSteps`: Interactive timeline component with main flow dots and branch flow for terminal states (rejected/cancelled)
- Server-safe config lives in `src/components/admin/status-config.ts` — exports `CONFIGURATION_STATUSES`, `QUOTE_STATUSES`, `ORDER_STATUSES`, `PRODUCTION_STATUSES` and the `StatusStep`/`StatusColor` types
- Import status constants from `status-config.ts`; import the components from `status-steps.tsx`

**Changelog/Novinky System**
- In-app changelog displayed to users in admin panel (`/admin/novinky`)
- Source data in `src/lib/changelog-data.ts` (manually maintained)
- **Workflow**: after a `feat`/`fix` commit that changes user-visible behavior, add a new entry to `src/lib/changelog-data.ts` with the user-friendly Czech `userDescription` written manually
- The `npm run changelog:translate` script (`scripts/generate-user-descriptions.ts`) was supposed to auto-translate via Claude API, but the regex is broken — do not rely on it

### Authentication & Authorization

- User roles: `admin` | `user` (defined in `src/lib/supabase/types.ts`)
- Profile management in `user_profiles` table
- Role utilities in `src/lib/auth/roles.ts`
- Middleware protects `/admin/*` routes, redirects to `/login` if unauthenticated
- Inactive users are signed out automatically
- `useAdminRole` hook (`src/hooks/use-admin-role.ts`): client-side role lookup with module-level cache and request deduplication — returns synchronously from cache on subsequent renders, re-fetches after 60s TTL

### Server Actions

Located in `src/app/actions/`:
- `submit-configuration.ts`: Public form submission with rate limiting and Turnstile verification; promotes a matching draft instead of inserting when one exists
- `draft-configuration.ts`: Public — `saveDraftConfiguration` (step 10→11), `loadDraftConfiguration` (`?draft=` prefill); rate-limited, no Turnstile/CSRF (mirrors `submit-configuration.ts`)
- `draft-admin-actions.ts`: Authenticated — manual reminder send + draft delete (single & bulk); delete is restricted to `is_draft = true` rows
- `admin-actions.ts`: Configuration CRUD, quote management
- `user-actions.ts`: User management (admin only)
- `profile-actions.ts`: User profile updates

**Idempotency**: `submit-configuration.ts` generates an `idempotency_key` from the configuration payload (`src/lib/configuration-mapping.ts` → `generateIdempotencyKey`) and the `configurations` table has a unique constraint on it. Duplicate submits inside the idempotency window return the existing row with `isDuplicate: true`; a race that slips past the pre-check is caught by Postgres error `23505` and resolved by looking the row back up. Use the same helper if you add new submit paths.

### API Routes

Located in `src/app/api/admin/`:
- **quotes/**: CRUD, PDF generation, versioning, status updates, convert to order, generate-items
- **orders/**: CRUD, PDF generation, status updates
- **production/**: CRUD, PDF generation, checklist items
- **products/**: CRUD, Pipedrive sync, bulk operations (bulk-update, bulk-delete, bulk-price-update)
- **product-groups/**: Product group CRUD with items
- **mapping-rules/**: Product mapping CRUD, auto-assign
- **sidebar-counts/**: Badge counts for admin sidebar
- **export/**: Data export

Other routes:
- `/api/health`: Health check endpoint for Railway deployment

### API Utilities

`src/lib/api-utils.ts` — use these in all API routes:
- `apiError(message, status, code?)`: standardized `NextResponse` error
- `handleDbError(error, context?)`: maps Postgres error codes (23505→409, 23503→400, etc.) to typed responses
- `withErrorHandler(handler)`: wraps async route handlers with automatic catch→`handleDbError`
- `HttpStatus`: typed constants for HTTP status codes

### Security

- **Iframe embedding**: Only `/embed` route allows iframe embedding (CSP `frame-ancestors`). All other routes use `X-Frame-Options: SAMEORIGIN`.
- **Subdomain restriction**: Do NOT use wildcard subdomains (`*.rentmil.cz`) in CSP — explicit domains only to prevent subdomain takeover attacks. See `next.config.ts`.
- **API routes**: Product API routes use explicit field-by-field mapping (not spread operators) for POST/PUT to prevent mass assignment.
- **CSRF protection**: `src/lib/csrf.ts` — call `validateCsrf()` in server actions and API routes that mutate data. Validates `Origin`/`Referer` headers against `NEXT_PUBLIC_APP_URL` and localhost.
- **Input sanitization**: `src/lib/sanitize.ts` — use `escapeHtml()` / `stripHtml()` when outputting user-supplied data in HTML contexts.

### Deployment

Deployed on Railway using Nixpacks:
- `railway.json`: Build and deploy configuration with health checks
- `nixpacks.toml`: System dependencies (Node.js 20, Chromium for Puppeteer)
- Puppeteer uses Nix Chromium (`PUPPETEER_EXECUTABLE_PATH=/nix/var/nix/profiles/default/bin/chromium`)
- PDF generation uses browser instance pooling (`src/lib/puppeteer-pool.ts`) and logo caching (`src/lib/pdf/logo-cache.ts`)

### Key Integrations

- **Supabase**: Auth, database, file storage
  - `src/lib/supabase/client.ts`: Browser client
  - `src/lib/supabase/server.ts`: Server component client
  - `src/lib/supabase/admin.ts`: Service role client (bypasses RLS)
- **Pipedrive CRM**: Direct API integration for deals and products
  - `src/lib/pipedrive/client.ts`: Product sync
  - `src/lib/pipedrive/deals.ts`: Persons, Deals, Deal Products API
  - On configuration submit: Creates Person + Deal with products attached, placed into the "Poptávka (zájem)" pipeline stage (falls back to first stage if not found)
- **Resend**: Email delivery for customer notifications
  - `src/lib/email/client.ts`: Resend client
  - `src/lib/email/templates/`: Email templates
  - Sends confirmation email after configuration submission
- **Upstash Redis**: Rate limiting for form submissions (`src/lib/rate-limit.ts`)
- **Cloudflare Turnstile**: Bot protection (`src/lib/turnstile.ts`, `src/components/turnstile.tsx`)

### Database Types

All database types manually defined in `src/lib/supabase/types.ts` (not auto-generated from Supabase).

Two patterns exist:
- **Database-extracted types**: `Configuration`, `ConfigurationInsert`, `ConfigurationUpdate` are extracted from the `Database` interface via `Database['public']['Tables']['configurations']['Row|Insert|Update']`
- **Standalone interfaces**: `Product`, `ProductInsert`, `ProductUpdate` (and most others) are fully manual interfaces — needed for complex fields (JSONB arrays, custom types)

When adding new types, follow whichever pattern the entity already uses. For new entities with JSONB or array columns, prefer standalone interfaces.

Key types:
- `Configuration`: Pool configurations from customers. Draft-tracking columns: `is_draft` (currently a draft), `was_draft` (ever was a draft — survives promotion), `reminder_email_id`/`reminder_sent_at` (manual reminder), `anonymized_at` (GDPR cleanup)
- `Quote`, `QuoteItem`, `QuoteVersion`, `QuoteVariant`: Quote management
- `Order`: Customer orders (created from accepted quotes)
- `ProductionOrder`, `ProductionOrderItem`: Manufacturing tracking with material checklist
- `Product`: Product catalog with dynamic pricing (see Pricing System below)
- `ProductGroup`, `ProductGroupItem`: Product bundles for quick quote additions
- `UserProfile`: User profiles with roles
- `SyncLog`: Pipedrive sync tracking
- `ProductMappingRule`: Maps configurator choices to products
- `GeneratedQuoteItem`: Generated items before saving to DB
- `SetAddon`: Set addon definition (stored as JSONB on Product)
- `ProductPriceHistory`: Historical tracking of product price changes
- `SignatureBanner`, `SignatureTemplate`: Email signature banner library + template selection

### Product Categories

Products are organized into categories (`ProductCategory` type):
- `skelety`: Pool shells/skeletons
- `sety`: Complete pool sets
- `schodiste`: Stairs
- `technologie`: Filtration, skimmers, jets, shafts
- `osvetleni`: LED lights, transformers
- `uprava_vody`: Salt water, UV lamps, dosing systems
- `protiproud`: Counter-current systems
- `ohrev`: Heat pumps
- `material`: Edge tubes, penetrations, fittings
- `priplatky`: Surcharges (8mm thickness, sharp corners, depth changes)
- `chemie`: Chlorine, pH, salt
- `zatepleni`: Wall and floor insulation
- `vysavace`: Manual and robotic vacuums
- `sluzby`: Services
- `doprava`: Delivery
- `jine`: Other

### Pricing System

Products support three pricing types (`src/lib/pricing/`):

1. **Fixed** (`price_type: 'fixed'`): Direct `unit_price`
2. **Percentage** (`price_type: 'percentage'`): Percentage of a reference product's price
   - `price_reference_product_id`: The product to calculate from
   - `price_percentage`: Percentage value (e.g., 10 = 10%)
   - `price_minimum`: Optional minimum price floor
3. **Coefficient** (`price_type: 'coefficient'`): Multiplied by pool measurement
   - `price_coefficient`: Value per unit
   - `coefficient_unit`: `'m2'` (surface area) or `'bm'` (perimeter in running meters)

Additional product fields:
- `material_thickness`: `'5mm'` | `'8mm'` for skeleton variants
- `prerequisite_product_ids`: Products that must be in quote for this product to apply
- `prerequisite_pool_shapes`: Pool shapes where prerequisites are NOT checked (e.g., circle pools skip sharp corner prerequisite for 8mm material)
- `required_surcharge_ids`: Surcharges auto-added when this product is selected
- `tags`: Array of tags for filtering/grouping

**Pricing utilities** (`src/lib/pricing/`):
- `calculate-price.ts`: Price calculation with context (pool dimensions, existing items)
- `pool-surface.ts`: Pool surface area, perimeter, volume calculations
- `check-prerequisites.ts`: Validates prerequisite products are in quote before adding
- `parse-skeleton-code.ts`: Parses `BAZ-{SHAPE}-{TYPE}-{DIMENSIONS}` codes to extract pool parameters

### Product Groups

Bundles of products that can be added to quotes together:
- Managed at `/admin/nastaveni/produkty/skupiny`
- API: `/api/admin/product-groups/`
- Each group has items with quantities and sort order

### Form Validation

Zod schemas in `src/lib/validations/configuration.ts` define all pool configuration options (shapes, types, colors, stairs, etc.).

### UI Components

- shadcn/ui components in `src/components/ui/`
- Admin components in `src/components/admin/`
- Configurator step components in `src/components/configurator/steps/`

### Czech Formatting Utilities

Before rolling custom formatting, check `src/lib/utils/` — has helpers for CZK/numbers (`format.ts`), Czech month names (`czech-month.ts`), and salutation declension (`czech-salutation.ts`).

### Database Migrations

Located in `supabase/migrations/`, numbered by date (e.g., `20251225000001_product_mapping.sql`). Apply with `npx supabase db push`. Some features rely on **`pg_cron`** scheduled jobs defined inside migrations (e.g., `20260521000004_draft_anonymization_cron.sql` — GDPR cleanup of stale drafts). When debugging anonymization/cleanup behavior, check the cron job definitions, not just the application code.

### In-flight Plans

Before starting non-trivial work, check `docs/superpowers/plans/` for an existing plan on the same topic. Follow or update the existing plan instead of starting from scratch.

## Environment Variables

Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations)

Required for integrations:
- `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_SUBDOMAIN`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `ANTHROPIC_API_KEY` (changelog translation only)
- `NEXT_PUBLIC_APP_URL` (used by CSRF validation; optional in dev, set to production URL in prod)

Note: `.env.local.example` exists but may be incomplete — refer to this list as the source of truth.

## Pool Configuration Options

Pool shapes: `circle`, `rectangle_rounded`, `rectangle_sharp`
Pool types: `skimmer`, `overflow`
Config fields for mapping: `technology`, `lighting`, `counterflow`, `waterTreatment`, `heating`, `roofing`
