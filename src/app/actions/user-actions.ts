'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import type { UserProfile, UserRole, UserProfileUpdate } from '@/lib/supabase/types'

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<{ users: UserProfile[]; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return { users: [], error: 'Nepodařilo se načíst uživatele' }
    }

    return { users: data || [], error: null }
  } catch (error) {
    console.error('Error in getUsers:', error)
    return { users: [], error: 'Chyba při načítání uživatelů' }
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUser(data: {
  email: string
  password: string
  full_name: string
  role: UserRole
  phone?: string
}): Promise<{ success: boolean; error: string | null; userId?: string }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Uživatel s tímto emailem již existuje' }
      }
      return { success: false, error: 'Nepodařilo se vytvořit uživatele' }
    }

    if (!authData.user) {
      return { success: false, error: 'Nepodařilo se vytvořit uživatele' }
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        active: true,
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Nepodařilo se vytvořit profil uživatele' }
    }

    revalidatePath('/admin/uzivatele')

    return { success: true, error: null, userId: authData.user.id }
  } catch (error) {
    console.error('Error in createUser:', error)
    return { success: false, error: 'Chyba při vytváření uživatele' }
  }
}

/**
 * Update a user (admin only)
 */
export async function updateUser(
  id: string,
  data: UserProfileUpdate
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error('Error updating user:', error)
      return { success: false, error: 'Nepodařilo se aktualizovat uživatele' }
    }

    revalidatePath('/admin/uzivatele')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in updateUser:', error)
    return { success: false, error: 'Chyba při aktualizaci uživatele' }
  }
}

/**
 * Deactivate a user (admin only)
 */
export async function deactivateUser(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deactivating user:', error)
      return { success: false, error: 'Nepodařilo se deaktivovat uživatele' }
    }

    revalidatePath('/admin/uzivatele')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deactivateUser:', error)
    return { success: false, error: 'Chyba při deaktivaci uživatele' }
  }
}

/**
 * Activate a user (admin only)
 */
export async function activateUser(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ active: true })
      .eq('id', id)

    if (error) {
      console.error('Error activating user:', error)
      return { success: false, error: 'Nepodařilo se aktivovat uživatele' }
    }

    revalidatePath('/admin/uzivatele')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in activateUser:', error)
    return { success: false, error: 'Chyba při aktivaci uživatele' }
  }
}

/**
 * Reset user's password (admin only)
 */
export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword,
    })

    if (error) {
      console.error('Error resetting password:', error)
      return { success: false, error: 'Nepodařilo se resetovat heslo' }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in resetUserPassword:', error)
    return { success: false, error: 'Chyba při resetování hesla' }
  }
}

/**
 * Delete a user (admin only) - permanently removes user
 */
export async function deleteUser(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createAdminClient()

    // Delete auth user (profile will be cascade deleted)
    const { error } = await supabase.auth.admin.deleteUser(id)

    if (error) {
      console.error('Error deleting user:', error)
      return { success: false, error: 'Nepodařilo se smazat uživatele' }
    }

    revalidatePath('/admin/uzivatele')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deleteUser:', error)
    return { success: false, error: 'Chyba při mazání uživatele' }
  }
}
