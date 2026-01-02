# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run lint             # Run ESLint
npm run start            # Start production server
npx supabase db push     # Apply database migrations
```

### Releases & Changelog

```bash
npm run release          # Create release (bumps version, updates CHANGELOG.md)
npm run release:patch    # Patch release (0.0.x)
npm run release:minor    # Minor release (0.x.0)
npm run release:major    # Major release (x.0.0)
npm run release:first    # First release (0.1.0, no version bump)
npm run changelog:translate  # Auto-translate changelog to user-friendly Czech (requires ANTHROPIC_API_KEY)
```

Uses standard-version with conventional commits. Commit format: `feat(scope): message`, `fix(scope): message`.
Git hooks enforce lint (pre-commit) and commit message format (commitlint).

## Architecture

This is a pool configurator application for Rentmil (Czech pool manufacturer) built with Next.js 16 App Router, Supabase, and TypeScript.

**Language**: Czech application - UI texts, URL slugs (`/admin/uzivatele`, `/admin/objednavky`), and database values are in Czech.

## Brand Guidelines

Brandboard: `/graphic/brandboard.pdf`

### Brand Message
- **Koncept**: "Bazénový Zen" - Rentmil prodává bezstarostný režim na zahradě, ne jen bazény
- **Hlavní slogan**: "Vy zenujete, my bazénujeme." (slovní hříčka zen + bazén)
- **Varianty**: "Vy zenujete, my servisujeme / zazimujeme / čistíme"
- **Tagline**: "Rentmil - Bazénový mistr" nebo "Váš bazénový mistr"

### USP (komunikovat)
- Klidovost, relaxace
- Recenze, spokojenost zákazníků

### Nekomunikovat
- Vodní sporty
- Dětskost

### Barvy
- **Rentmil modrá**: `#01384B` (primární, tmavá)
- **Rentmil vodová**: `#48A9A6` (sekundární, tyrkysová)
- **Růžová snová**: `#ED6663` (akcent)
- **Rentmil oranžová**: `#FF8621` (akcent)
- **Snový gradient**: `#FF8621 → #ED6663` (CTA, důležité prvky)

### Typografie
- **Nadpisy**: Forma DJR Display
- **Text**: Nunito Sans

### Vizuální styl
- **Pohyb**: Pomalá levitace, jakoby na vodě
- **Kompozice**: Osová souměrnost, Wes Anderson style
- **Efekty**: Glassmorphism, zasněné obličeje
- **Maskot**: "Bazénový mistr" - postavička v oranžovém tričku

### Assets
- Logo: `/public/logo-transparent.svg`
- Maskot: `/public/maskot-holding-hq.png`, `/public/maskot-hq.png`
- Hero foto: `/public/pool-hero.jpg`

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

**Embedded Mode** (`/embed`)
- Minimal UI version for iframe embedding in WordPress or other sites
- Access via `/embed` route
- Auto-resizes iframe via postMessage to parent window
- Removes header, decorations, and background styling for seamless integration
- Implementation: `ConfiguratorWrapper` component with `embedded` prop

**Admin Panel** (`/admin/*`)
- Protected routes via Supabase auth middleware (`src/lib/supabase/middleware.ts`)
- Dashboard, configurations management, quotes management, products, user management
- Route groups: `(admin)/admin/` for admin layouts
- `/admin/uzivatele` is admin-only (role check in middleware)
- `/admin/profil`: User profile settings
- `/admin/produkty/mapovani`: Product mapping rules editor
- `/admin/nastaveni`: Settings hub with sub-pages for products and users
- `/admin/novinky`: Changelog page showing version history with user-friendly Czech descriptions

**Quotes System**
- Creates formal quotes from configurations with line items
- Version tracking for quote history
- PDF generation via Puppeteer (HTML-to-PDF) at `/api/admin/quotes/[id]/pdf`
- Auto-generation of quote items from configuration via `src/lib/quote-generator.ts`
- Quote variants: Support for multiple pricing tiers (`ekonomicka`, `optimalni`, `premiova`)
- Quote statuses: `draft`, `sent`, `accepted`, `rejected`

**Orders System** (`/admin/objednavky`)
- Created from accepted quotes via status conversion
- Manages customer orders with status tracking
- Order statuses: `created`, `sent`, `in_production`

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
- Rules support constraints by pool shape and type

**Changelog/Novinky System**
- In-app changelog displayed to users in admin panel (`/admin/novinky`)
- Source data in `src/lib/changelog-data.ts` (manually maintained)
- Technical descriptions auto-translated to user-friendly Czech via Claude API
- Run `npm run changelog:translate` after adding new entries

### Authentication & Authorization

- User roles: `admin` | `user` (defined in `src/lib/supabase/types.ts`)
- Profile management in `user_profiles` table
- Role utilities in `src/lib/auth/roles.ts`
- Middleware protects `/admin/*` routes, redirects to `/login` if unauthenticated
- Inactive users are signed out automatically

### Server Actions

Located in `src/app/actions/`:
- `submit-configuration.ts`: Public form submission with rate limiting and Turnstile verification
- `admin-actions.ts`: Configuration CRUD, quote management
- `user-actions.ts`: User management (admin only)
- `profile-actions.ts`: User profile updates

### API Routes

Located in `src/app/api/admin/`:
- **quotes/**: CRUD, PDF generation, versioning, status updates, convert to order, generate-items
- **orders/**: CRUD, PDF generation, status updates
- **production/**: CRUD, PDF generation, checklist items
- **products/**: Pipedrive sync, bulk operations (bulk-update, bulk-delete)
- **mapping-rules/**: Product mapping CRUD, auto-assign
- **sidebar-counts/**: Badge counts for admin sidebar
- **export/**: Data export

Other routes:
- `/api/health`: Health check endpoint for Railway deployment

### Deployment

Deployed on Railway using Nixpacks:
- `railway.json`: Build and deploy configuration with health checks
- `nixpacks.toml`: System dependencies (Node.js 20, Chromium for Puppeteer)
- Puppeteer uses Nix Chromium (`PUPPETEER_EXECUTABLE_PATH=/nix/var/nix/profiles/default/bin/chromium`)

### Key Integrations

- **Supabase**: Auth, database, file storage
  - `src/lib/supabase/client.ts`: Browser client
  - `src/lib/supabase/server.ts`: Server component client
  - `src/lib/supabase/admin.ts`: Service role client (bypasses RLS)
- **Pipedrive CRM**: Direct API integration for deals and products
  - `src/lib/pipedrive/client.ts`: Product sync
  - `src/lib/pipedrive/deals.ts`: Persons, Deals, Deal Products API
  - On configuration submit: Creates Person + Deal with products attached
- **Resend**: Email delivery for customer notifications
  - `src/lib/email/client.ts`: Resend client
  - `src/lib/email/templates/`: Email templates
  - Sends confirmation email after configuration submission
- **Upstash Redis**: Rate limiting for form submissions (`src/lib/rate-limit.ts`)
- **Cloudflare Turnstile**: Bot protection (`src/lib/turnstile.ts`, `src/components/turnstile.tsx`)

### Database Types

All database types defined in `src/lib/supabase/types.ts`:
- `Configuration`: Pool configurations from customers
- `Quote`, `QuoteItem`, `QuoteVersion`, `QuoteVariant`: Quote management
- `Order`: Customer orders (created from accepted quotes)
- `ProductionOrder`, `ProductionChecklist`: Manufacturing tracking
- `Product`: Product catalog synced with Pipedrive (categories: `bazeny`, `prislusenstvi`, `sluzby`, `doprava`)
- `UserProfile`: User profiles with roles
- `SyncLog`: Pipedrive sync tracking
- `ProductMappingRule`: Maps configurator choices to products
- `GeneratedQuoteItem`: Generated items before saving to DB

### Form Validation

Zod schemas in `src/lib/validations/configuration.ts` define all pool configuration options (shapes, types, colors, stairs, etc.).

### UI Components

- shadcn/ui components in `src/components/ui/`
- Admin components in `src/components/admin/`
- Configurator step components in `src/components/configurator/steps/`

### Database Migrations

Located in `supabase/migrations/`:
- Run `npx supabase db push` to apply migrations to local/remote database
- Migrations are numbered by date (e.g., `20251225000001_product_mapping.sql`)

### Git Workflow

- Husky pre-commit hooks with commitlint
- Commit format: `type(scope): description` (e.g., `feat(quotes): add PDF export`)
- Standard-version for automatic versioning and CHANGELOG.md generation

## Environment Variables

Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations)

Required for integrations:
- `PIPEDRIVE_API_TOKEN`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

## Pool Configuration Options

Pool shapes: `circle`, `rectangle_rounded`, `rectangle_sharp`
Pool types: `skimmer`, `overflow`
Config fields for mapping: `stairs`, `technology`, `lighting`, `counterflow`, `waterTreatment`, `heating`, `roofing`
