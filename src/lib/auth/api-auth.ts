import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateCsrf } from '@/lib/csrf'
import { checkAdminWriteLimit } from '@/lib/rate-limit'
import type { User } from '@supabase/supabase-js'

export type AuthResult =
  | { error: NextResponse }
  | { user: User; supabase: Awaited<ReturnType<typeof createClient>> }

export type AdminResult =
  | { error: NextResponse }
  | { user: User; profile: { role: string }; supabase: Awaited<ReturnType<typeof createClient>> }

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { user, supabase }
}

export async function requireAdmin(): Promise<AdminResult> {
  // CSRF validation for mutating requests
  const csrfError = await validateCsrf()
  if (csrfError) {
    return { error: csrfError }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (profileError || !profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
  }

  // Rate limit admin write operations
  const rateLimit = await checkAdminWriteLimit(user.id)
  if (!rateLimit.success) {
    return {
      error: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          }
        }
      )
    }
  }

  return { user, profile, supabase }
}

export function isAuthError(result: AuthResult | AdminResult): result is { error: NextResponse } {
  return 'error' in result
}
