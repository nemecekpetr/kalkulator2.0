'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/client'
import type { SignatureTemplate, UserProfile } from '@/lib/supabase/types'

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
  full_name?: string
  email?: string | null
  phone?: string | null
  position?: string | null
  signature_template?: SignatureTemplate
  signature_banner_id?: string | null
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Uživatel není přihlášen' }
    }

    const update: Record<string, unknown> = {}
    if (data.full_name !== undefined) update.full_name = data.full_name
    if (data.email !== undefined) update.email = data.email || null
    if (data.phone !== undefined) update.phone = data.phone || null
    if (data.position !== undefined) update.position = data.position || null
    if (data.signature_template !== undefined) update.signature_template = data.signature_template
    if (data.signature_banner_id !== undefined) update.signature_banner_id = data.signature_banner_id

    if (Object.keys(update).length === 0) {
      return { success: true, error: null }
    }

    // Use admin client for update to bypass RLS type issues
    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
      .from('user_profiles')
      .update(update)
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
 * Send a test email with the user's current signature to their own email address.
 * Used to preview the signature in a real email client.
 */
export async function sendTestSignatureEmail(data: {
  html: string
  plainText: string
}): Promise<{ success: boolean; error: string | null; sentTo?: string }> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Uživatel není přihlášen' }
    }

    const adminSupabase = await createAdminClient()
    const { data: profile } = await adminSupabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const targetEmail = (profile as { email: string | null } | null)?.email || user.email
    if (!targetEmail) {
      return {
        success: false,
        error: 'V profilu chybí kontaktní email — doplňte ho v sekci Osobní údaje.',
      }
    }

    const intro = `<div style="font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;color:#01384B;font-size:14px;line-height:1.5;margin-bottom:24px;">
      <p style="margin:0 0 8px 0;">Toto je testovací email pro ověření vzhledu vašeho podpisu.</p>
      <p style="margin:0;color:#6B7280;font-size:12px;">Podpis se zobrazuje pod tímto textem tak, jak ho uvidí příjemce vašich emailů. Pokud se něco nezobrazuje správně, otevřete email v různých klientech (Gmail web, Outlook, mobilní aplikace) — render se mezi nimi může drobně lišit.</p>
    </div>
    <hr style="border:0;border-top:1px solid #E5E7EB;margin:0 0 24px 0;" />`

    const result = await sendEmail({
      to: targetEmail,
      subject: 'Testovací podpis Rentmil',
      html: intro + data.html,
      text: `Testovací email pro ověření vzhledu podpisu.\n\n---\n\n${data.plainText}`,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Nepodařilo se odeslat testovací email',
      }
    }

    return { success: true, error: null, sentTo: targetEmail }
  } catch (error) {
    console.error('Error in sendTestSignatureEmail:', error)
    return { success: false, error: 'Chyba při odesílání testovacího emailu' }
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
