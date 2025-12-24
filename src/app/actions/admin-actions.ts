'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'

export async function deleteConfiguration(id: string) {
  try {
    // Admin only - users cannot delete configurations
    await requireAdmin()

    const supabase = await createAdminClient()

    // Hard delete - remove from database
    const { error } = await supabase
      .from('configurations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting configuration:', error)
      return { success: false, error: 'Nepodarilo se smazat konfiguraci' }
    }

    revalidatePath('/admin/konfigurace')
    revalidatePath('/admin/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Error deleting configuration:', error)
    return { success: false, error: 'Nepodarilo se smazat konfiguraci' }
  }
}

export async function retryPipedriveSync(id: string) {
  try {
    // Admin only - users cannot trigger Pipedrive sync
    await requireAdmin()

    const supabase = await createAdminClient()

    // Get the configuration
    const { data: config, error: fetchError } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !config) {
      return { success: false, error: 'Konfigurace nenalezena' }
    }

    // Update status to pending
    await supabase
      .from('configurations')
      .update({ pipedrive_status: 'pending' })
      .eq('id', id)

    // Send to Make.com webhook
    const webhookUrl = process.env.MAKE_WEBHOOK_URL
    if (!webhookUrl) {
      // Log sync attempt
      await supabase.from('sync_log').insert({
        configuration_id: id,
        status: 'error',
        error_message: 'Webhook URL neni nakonfigurovana',
      })

      await supabase
        .from('configurations')
        .update({ pipedrive_status: 'error' })
        .eq('id', id)

      return { success: false, error: 'Webhook URL neni nakonfigurovana' }
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configuration_id: config.id,
        contact: {
          name: config.contact_name,
          email: config.contact_email,
          phone: config.contact_phone,
        },
        pool: {
          shape: config.pool_shape,
          type: config.pool_type,
          dimensions: config.dimensions,
          color: config.color,
          stairs: config.stairs,
          technology: config.technology,
          accessories: config.accessories,
          heating: config.heating,
          roofing: config.roofing,
        },
        message: config.message,
        created_at: config.created_at,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/pipedrive-callback`,
      }),
    })

    if (!webhookResponse.ok) {
      // Log sync attempt
      await supabase.from('sync_log').insert({
        configuration_id: id,
        status: 'error',
        error_message: `Webhook vratil chybu: ${webhookResponse.status}`,
      })

      await supabase
        .from('configurations')
        .update({ pipedrive_status: 'error' })
        .eq('id', id)

      return { success: false, error: 'Webhook vratil chybu' }
    }

    // Log sync attempt
    await supabase.from('sync_log').insert({
      configuration_id: id,
      status: 'pending',
    })

    revalidatePath('/admin/konfigurace')
    revalidatePath('/admin/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Error retrying Pipedrive sync:', error)
    return { success: false, error: 'Nepodarilo se odeslat do Pipedrive' }
  }
}

export async function getConfiguration(id: string) {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching configuration:', error)
      return { configuration: null, error: 'Konfigurace nenalezena' }
    }

    return { configuration: data, error: null }
  } catch (error) {
    console.error('Error fetching configuration:', error)
    return { configuration: null, error: 'Chyba pri nacitani konfigurace' }
  }
}

export async function updateConfiguration(
  id: string,
  data: {
    contact_name?: string
    contact_email?: string
    contact_phone?: string
    pool_shape?: string
    pool_type?: string
    dimensions?: Record<string, number>
    color?: string
    stairs?: string
    technology?: string[]
    accessories?: string[]
    heating?: string
    roofing?: string
    message?: string
  }
) {
  try {
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('configurations')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error('Error updating configuration:', error)
      return { success: false, error: 'Nepodarilo se aktualizovat konfiguraci' }
    }

    revalidatePath('/admin/konfigurace')
    revalidatePath(`/admin/konfigurace/${id}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating configuration:', error)
    return { success: false, error: 'Nepodarilo se aktualizovat konfiguraci' }
  }
}

export async function createConfiguration(data: {
  contact_name: string
  contact_email: string
  contact_phone?: string
  pool_shape: string
  pool_type: string
  dimensions: Record<string, number>
  color: string
  stairs: string
  technology: string[]
  accessories: string[]
  heating: string
  roofing: string
  message?: string
}) {
  try {
    const supabase = await createAdminClient()

    const { data: config, error } = await supabase
      .from('configurations')
      .insert({
        ...data,
        pipedrive_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating configuration:', error)
      return { success: false, error: 'Nepodarilo se vytvorit konfiguraci', id: null }
    }

    revalidatePath('/admin/konfigurace')
    revalidatePath('/admin/dashboard')

    return { success: true, id: config.id, error: null }
  } catch (error) {
    console.error('Error creating configuration:', error)
    return { success: false, error: 'Nepodarilo se vytvorit konfiguraci', id: null }
  }
}

export async function getSyncLogs(configurationId: string) {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('sync_log')
      .select('*')
      .eq('configuration_id', configurationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sync logs:', error)
      return { logs: [], error: 'Nepodarilo se nacist logy' }
    }

    return { logs: data || [], error: null }
  } catch (error) {
    console.error('Error fetching sync logs:', error)
    return { logs: [], error: 'Chyba pri nacitani logu' }
  }
}
