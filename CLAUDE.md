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

## Architecture

This is a pool configurator application for Rentmil (Czech pool manufacturer) built with Next.js 16.1 App Router, Supabase, and TypeScript.

### Core Components

**Public Configurator** (`/`)
- 11-step wizard for customers to configure pool specifications
- State managed via Zustand store (`src/stores/configurator-store.ts`) with localStorage persistence
- Steps: 1.Shape > 2.Type > 3.Dimensions > 4.Color > 5.Stairs > 6.Technology > 7.Accessories > 8.Heating > 9.Roofing > 10.Contact > 11.Summary
- Step 5 (Stairs) is automatically skipped for circular pools
- Configuration constants in `src/lib/constants/configurator.ts`

**Admin Panel** (`/admin/*`)
- Protected routes via Supabase auth middleware (`src/lib/supabase/middleware.ts`)
- Dashboard, configurations management, quotes management, products, user management
- Route groups: `(admin)/admin/` for admin layouts
- `/admin/uzivatele` is admin-only (role check in middleware)
- `/admin/produkty/mapovani`: Product mapping rules editor
- `/admin/produkty/cenik-bazenu`: Pool base prices editor

**Quotes System**
- Creates formal quotes from configurations with line items
- Version tracking for quote history
- PDF generation via `@react-pdf/renderer` (`src/lib/pdf/quote-template.tsx`)
- Auto-generation of quote items from configuration via `src/lib/quote-generator.ts`
- Quote variants: Support for multiple pricing tiers (`ekonomicka`, `optimalni`, `premiova`)

**Product Mapping System**
- Maps configurator choices to products for automatic quote generation
- `ProductMappingRule`: Maps config fields (stairs, technology, heating, etc.) to products
- Pool products are matched by code format: `BAZ-{SHAPE}-{TYPE}-{DIMENSIONS}` (e.g., `BAZ-OBD-SK-3-6-1.2`)
- Rules support constraints by pool shape and type

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

Located in `src/app/api/`:
- `/api/admin/quotes/[id]/pdf`: PDF generation for quotes
- `/api/admin/quotes/[id]/versions`: Quote version history
- `/api/admin/quotes/[id]/versions/[versionId]/restore`: Restore quote from version
- `/api/admin/quotes/generate-items`: Auto-generate quote items from configuration
- `/api/admin/products/sync`: Pipedrive product sync
- `/api/admin/products/bulk-update`: Bulk product updates
- `/api/admin/products/bulk-delete`: Bulk product deletion
- `/api/admin/mapping-rules`: Product mapping rules CRUD
- `/api/admin/mapping-rules/auto-assign`: Auto-assign products to mapping rules
- `/api/admin/export`: Data export
- `/api/webhook/pipedrive-callback`: Pipedrive webhook handler

### Key Integrations

- **Supabase**: Auth, database, file storage
  - `src/lib/supabase/client.ts`: Browser client
  - `src/lib/supabase/server.ts`: Server component client
  - `src/lib/supabase/admin.ts`: Service role client (bypasses RLS)
- **Pipedrive CRM**: Syncs products from Pipedrive (`src/lib/pipedrive/client.ts`)
- **Upstash Redis**: Rate limiting for form submissions (`src/lib/rate-limit.ts`)
- **Cloudflare Turnstile**: Bot protection (`src/lib/turnstile.ts`, `src/components/turnstile.tsx`)

### Database Types

All database types defined in `src/lib/supabase/types.ts`:
- `Configuration`: Pool configurations from customers
- `Quote`, `QuoteItem`, `QuoteVersion`: Quote management
- `Product`: Product catalog synced with Pipedrive (categories: `bazeny`, `prislusenstvi`, `sluzby`, `doprava`)
- `UserProfile`: User profiles with roles
- `SyncLog`: Pipedrive sync tracking
- `ProductMappingRule`: Maps configurator choices to products
- `GeneratedQuoteItem`: Generated items before saving to DB
- `QuoteVariant`: Quote pricing tiers (ekonomická/optimální/prémiová)

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

## Environment Variables

Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations)

Required for integrations:
- `PIPEDRIVE_API_TOKEN`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

## Pool Configuration Options

Pool shapes: `circle`, `rectangle_rounded`, `rectangle_sharp`
Pool types: `skimmer`, `overflow`
Config fields for mapping: `stairs`, `technology`, `lighting`, `counterflow`, `waterTreatment`, `heating`, `roofing`
