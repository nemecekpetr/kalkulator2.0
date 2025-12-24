import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from './roles'
import type { UserProfile, UserRole } from '@/lib/supabase/types'

/**
 * Server-side guard that requires a specific role
 * Redirects to dashboard if user doesn't have the required role
 * Throws redirect - use in server components and server actions
 */
export async function requireRole(role: UserRole): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!profile.active) {
    redirect('/login?error=inactive')
  }

  if (profile.role !== role && role === 'admin') {
    redirect('/admin/dashboard')
  }

  return profile
}

/**
 * Shortcut for requireRole('admin')
 * Use in admin-only pages and actions
 */
export async function requireAdmin(): Promise<UserProfile> {
  return requireRole('admin')
}

/**
 * Require any authenticated user with an active profile
 * Use in pages that both admin and user can access
 */
export async function requireAuth(): Promise<UserProfile> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (!profile.active) {
    redirect('/login?error=inactive')
  }

  return profile
}
