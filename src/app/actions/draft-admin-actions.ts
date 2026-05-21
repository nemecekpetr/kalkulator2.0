'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { sendEmail } from '@/lib/email/client'
import {
  generateConfigurationReminderHtml,
  generateConfigurationReminderText,
} from '@/lib/email/templates/configuration-reminder'
import type { Configuration } from '@/lib/supabase/types'

// Administrace rozpracovaných konfigurací — ruční odeslání připomínky a mazání.
// Přístup má každý přihlášený uživatel; mazání je omezeno jen na drafty.

interface SendReminderResult {
  success: boolean
  error?: string
}

interface BulkReminderResult {
  success: boolean
  sent: number
  failed: number
  error?: string
}

interface DeleteResult {
  success: boolean
  error?: string
}

interface BulkDeleteResult {
  success: boolean
  deleted: number
  error?: string
}

/** Odkaz na konfigurátor s předvyplněnou konfigurací (`?draft=<id>`). */
function getResumeUrl(draftId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://kalkulator20-production.up.railway.app'
  return `${base.replace(/\/$/, '')}/?draft=${draftId}`
}

/** Odešle připomínkový e-mail na jednu konfiguraci a zapíše čas odeslání. */
async function sendReminderToConfiguration(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  config: Configuration
): Promise<SendReminderResult> {
  const resumeUrl = getResumeUrl(config.id)
  const result = await sendEmail({
    to: config.contact_email,
    subject: 'Skoro hotovo — váš bazén na vás čeká',
    html: generateConfigurationReminderHtml(config, resumeUrl),
    text: generateConfigurationReminderText(config, resumeUrl),
    replyTo: 'bazeny@rentmil.cz',
  })

  if (!result.success) {
    return { success: false, error: result.error || 'E-mail se nepodařilo odeslat' }
  }

  await supabase
    .from('configurations')
    .update({
      reminder_sent_at: new Date().toISOString(),
      reminder_email_id: result.messageId ?? null,
    })
    .eq('id', config.id)

  return { success: true }
}

/**
 * Ručně odešle připomínku jedné rozpracované konfiguraci.
 * O příjemci rozhoduje přihlášený uživatel.
 */
export async function sendConfigurationReminder(configId: string): Promise<SendReminderResult> {
  await requireAuth()

  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', configId)
      .maybeSingle()

    if (error || !data) {
      return { success: false, error: 'Konfigurace nenalezena' }
    }

    const config = data as Configuration
    if (!config.is_draft) {
      return { success: false, error: 'Konfigurace už byla odeslána — připomínka nemá smysl' }
    }

    const result = await sendReminderToConfiguration(supabase, config)
    if (result.success) {
      revalidatePath('/admin/konfigurace')
    }
    return result
  } catch (error) {
    console.error('sendConfigurationReminder error:', error)
    return { success: false, error: 'Nepodařilo se odeslat připomínku' }
  }
}

/**
 * Hromadně odešle připomínku více rozpracovaným konfiguracím.
 * Odeslané (ne-draft) konfigurace v seznamu se přeskočí.
 */
export async function sendConfigurationRemindersBulk(
  configIds: string[]
): Promise<BulkReminderResult> {
  await requireAuth()

  try {
    if (configIds.length === 0) {
      return { success: false, sent: 0, failed: 0, error: 'Nebyla vybrána žádná konfigurace' }
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('configurations')
      .select('*')
      .in('id', configIds)
      .eq('is_draft', true)

    if (error || !data) {
      return { success: false, sent: 0, failed: 0, error: 'Nepodařilo se načíst konfigurace' }
    }

    let sent = 0
    let failed = 0
    for (const row of data as Configuration[]) {
      const res = await sendReminderToConfiguration(supabase, row)
      if (res.success) sent++
      else failed++
    }

    revalidatePath('/admin/konfigurace')
    return { success: true, sent, failed }
  } catch (error) {
    console.error('sendConfigurationRemindersBulk error:', error)
    return { success: false, sent: 0, failed: 0, error: 'Nepodařilo se odeslat připomínky' }
  }
}

/**
 * Smaže jednu rozpracovanou konfiguraci. Filtr `is_draft = true` zaručuje,
 * že touto akcí nelze smazat odeslanou poptávku.
 */
export async function deleteDraftConfiguration(configId: string): Promise<DeleteResult> {
  await requireAuth()

  try {
    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('configurations')
      .delete()
      .eq('id', configId)
      .eq('is_draft', true)

    if (error) {
      console.error('deleteDraftConfiguration error:', error)
      return { success: false, error: 'Nepodařilo se smazat konfiguraci' }
    }

    revalidatePath('/admin/konfigurace')
    return { success: true }
  } catch (error) {
    console.error('deleteDraftConfiguration error:', error)
    return { success: false, error: 'Nepodařilo se smazat konfiguraci' }
  }
}

/**
 * Hromadně smaže rozpracované konfigurace. Odeslané konfigurace ve výběru
 * se nesmažou (filtr `is_draft = true`).
 */
export async function deleteDraftConfigurationsBulk(
  configIds: string[]
): Promise<BulkDeleteResult> {
  await requireAuth()

  try {
    if (configIds.length === 0) {
      return { success: false, deleted: 0, error: 'Nebyla vybrána žádná konfigurace' }
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('configurations')
      .delete()
      .in('id', configIds)
      .eq('is_draft', true)
      .select('id')

    if (error) {
      console.error('deleteDraftConfigurationsBulk error:', error)
      return { success: false, deleted: 0, error: 'Nepodařilo se smazat konfigurace' }
    }

    revalidatePath('/admin/konfigurace')
    return { success: true, deleted: data?.length ?? 0 }
  } catch (error) {
    console.error('deleteDraftConfigurationsBulk error:', error)
    return { success: false, deleted: 0, error: 'Nepodařilo se smazat konfigurace' }
  }
}
