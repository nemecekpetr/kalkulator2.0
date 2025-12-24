'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { UserProfile } from '@/lib/supabase/types'

/**
 * Get the current user's profile
 */
export async function getMyProfile(): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { profile: null, error: 'Uživatel není přihlášen' }
    }

    // Use admin client to bypass type issues
    const adminSupabase = await createAdminClient()
    const { data: profile, error } = await adminSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return { profile: null, error: 'Profil nenalezen' }
    }

    return { profile: profile as UserProfile, error: null }
  } catch (error) {
    console.error('Error in getMyProfile:', error)
    return { profile: null, error: 'Chyba při načítání profilu' }
  }
}

/**
 * Update the current user's profile
 */
export async function updateMyProfile(data: {
  full_name: string
  email?: string | null
  phone?: string | null
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Uživatel není přihlášen' }
    }

    // Use admin client for update to bypass RLS type issues
    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
      .from('user_profiles')
      .update({
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: 'Nepodařilo se aktualizovat profil' }
    }

    revalidatePath('/admin/profil')
    revalidatePath('/admin')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in updateMyProfile:', error)
    return { success: false, error: 'Chyba při aktualizaci profilu' }
  }
}

/**
 * Change the current user's password
 */
export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      return { success: false, error: 'Uživatel není přihlášen' }
    }

    // First verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    })

    if (signInError) {
      return { success: false, error: 'Aktuální heslo není správné' }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (updateError) {
      console.error('Error updating password:', updateError)
      return { success: false, error: 'Nepodařilo se změnit heslo' }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in changePassword:', error)
    return { success: false, error: 'Chyba při změně hesla' }
  }
}
