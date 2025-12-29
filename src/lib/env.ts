/**
 * Environment Variables Validation
 * Validates required env vars at application startup
 */

interface EnvConfig {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // Pipedrive
  PIPEDRIVE_API_TOKEN: string

  // Email (Resend)
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string

  // Rate Limiting (Upstash)
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string

  // Turnstile
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: string
  TURNSTILE_SECRET_KEY: string
}

// Required in production, optional in development
const REQUIRED_IN_PRODUCTION: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PIPEDRIVE_API_TOKEN',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
]

// Always required
const ALWAYS_REQUIRED: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

interface ValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Validate environment variables
 * Call this at application startup
 */
export function validateEnv(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production'
  const required = isProduction ? REQUIRED_IN_PRODUCTION : ALWAYS_REQUIRED

  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check optional but recommended variables in development
  if (!isProduction) {
    const optional = REQUIRED_IN_PRODUCTION.filter(k => !ALWAYS_REQUIRED.includes(k))
    for (const key of optional) {
      if (!process.env[key]) {
        warnings.push(`${key} is not set (optional in development)`)
      }
    }
  }

  // Validate email format if set
  if (process.env.RESEND_FROM_EMAIL) {
    const email = process.env.RESEND_FROM_EMAIL
    // Should be in format "Name <email@domain.com>" or just "email@domain.com"
    if (!email.includes('@') || !email.includes('.')) {
      warnings.push('RESEND_FROM_EMAIL does not appear to be a valid email format')
    }
  }

  // Validate URLs
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    } catch {
      missing.push('NEXT_PUBLIC_SUPABASE_URL (invalid URL format)')
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Get validated environment variable
 * Throws if not set in production
 */
export function getEnv<K extends keyof EnvConfig>(key: K): string {
  const value = process.env[key]

  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    console.warn(`Environment variable ${key} is not set`)
    return ''
  }

  return value
}

/**
 * Check if Pipedrive integration is configured
 */
export function isPipedriveConfigured(): boolean {
  return !!process.env.PIPEDRIVE_API_TOKEN
}

/**
 * Check if Email (Resend) integration is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL
}

/**
 * Check if Rate Limiting is configured
 */
export function isRateLimitConfigured(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
}

/**
 * Check if Turnstile is configured
 */
export function isTurnstileConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!process.env.TURNSTILE_SECRET_KEY
}
