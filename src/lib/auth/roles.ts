import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserProfile, UserRole } from '@/lib/supabase/types'

/**
 * Get the current user's profile from the database
 * Returns null if user is not logged in or has no profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * Get the current user's profile using admin client (bypasses RLS)
 * Useful for middleware and server actions
 */
export async function getCurrentUserProfileAdmin(userId: string): Promise<UserProfile | null> {
  const supabase = await createAdminClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return profile
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'admin'
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === role
}

/**
 * Get all users (admin only - uses admin client)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return data || []
}

/**
 * Get user profile by ID (admin only - uses admin client)
 */
export async function getUserById(id: string): Promise<UserProfile | null> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single()

  return data
}
