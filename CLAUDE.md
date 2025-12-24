# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture

This is a pool configurator application for Rentmil (Czech pool manufacturer) built with Next.js 16 App Router, Supabase, and TypeScript.

### Core Components

**Public Configurator** (`/`)
- 11-step wizard for customers to configure pool specifications
- State managed via Zustand store (`src/stores/configurator-store.ts`) with localStorage persistence
- Steps: Shape > Type > Dimensions > Color > Stairs > Technology > Accessories > Heating > Roofing > Contact > Summary
- Step 5 (Stairs) is automatically skipped for circular pools
- Configuration constants in `src/lib/constants/configurator.ts`

**Admin Panel** (`/admin/*`)
- Protected routes via Supabase auth middleware
- Dashboard, configurations management, quotes management, products
- Route groups: `(admin)/admin/` for admin layouts

**Quotes System**
- Creates formal quotes from configurations with line items
- Version tracking for quote history
- PDF generation via `@react-pdf/renderer` (`src/lib/pdf/quote-template.tsx`)

### Key Integrations

- **Supabase**: Auth, database, file storage. Client/server separation in `src/lib/supabase/`
- **Pipedrive CRM**: Syncs configurations as deals (`src/lib/pipedrive/client.ts`)
- **Upstash Redis**: Rate limiting for form submissions (`src/lib/rate-limit.ts`)
- **Cloudflare Turnstile**: Bot protection (`src/lib/turnstile.ts`, `src/components/turnstile.tsx`)

### Database Types

All database types defined in `src/lib/supabase/types.ts`:
- `Configuration`: Pool configurations from customers
- `Quote`, `QuoteItem`, `QuoteVersion`: Quote management
- `Product`: Product catalog synced with Pipedrive
- `SyncLog`: Pipedrive sync tracking

### Form Validation

Zod schemas in `src/lib/validations/configuration.ts` define all pool configuration options (shapes, types, colors, stairs, etc.).

### UI Components

- shadcn/ui components in `src/components/ui/`
- Admin components in `src/components/admin/`
- Configurator step components in `src/components/configurator/steps/`

## Environment Variables

Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations)

Required for integrations:
- `PIPEDRIVE_API_TOKEN`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
