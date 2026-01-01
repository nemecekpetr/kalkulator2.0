'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-role'
import { revalidatePath } from 'next/cache'
import { createPipedriveDealsClient, PIPEDRIVE_SOURCE_OPTIONS } from '@/lib/pipedrive/deals'
import { generateQuoteItemsFromConfiguration } from '@/lib/quote-generator'
import { sendEmail } from '@/lib/email/client'
import {
  configToEmailData,
  generateConfigurationEmailHtml,
  generateConfigurationEmailText,
} from '@/lib/email/templates/configuration-confirmation'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getLightingLabel,
  getCounterflowLabel,
  getWaterTreatmentLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'
import type { Configuration } from '@/lib/supabase/types'

// Generate deal note with configuration summary
function generateDealNote(config: Configuration): string {
  const lines = [
    '=== Konfigurace bazénu z webu ===',
    '',
    `Tvar: ${getShapeLabel(config.pool_shape)}`,
    `Typ: ${getTypeLabel(config.pool_type)}`,
    `Rozměry: ${formatDimensions(config.pool_shape, config.dimensions as { diameter?: number; width?: number; length?: number; depth?: number })}`,
    `Barva: ${getColorLabel(config.color)}`,
    `Schodiště: ${getStairsLabel(config.stairs)}`,
    `Technologie: ${getTechnologyLabel(config.technology)}`,
    `Osvětlení: ${getLightingLabel(config.lighting)}`,
    `Protiproud: ${getCounterflowLabel(config.counterflow)}`,
    `Úprava vody: ${getWaterTreatmentLabel(config.water_treatment)}`,
    `Ohřev: ${getHeatingLabel(config.heating)}`,
    `Zastřešení: ${getRoofingLabel(config.roofing)}`,
  ]

  if (config.contact_address) {
    lines.push('', `Místo instalace: ${config.contact_address}`)
  }

  lines.push('', `ID konfigurace: ${config.id}`)

  return lines.join('\n')
}

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
      .update({ pipedrive_status: 'pending', pipedrive_error: null })
      .eq('id', id)

    try {
      const pipedriveClient = createPipedriveDealsClient()

      // 1. Find or create person
      const person = await pipedriveClient.findOrCreatePerson({
        name: config.contact_name,
        email: config.contact_email,
        phone: config.contact_phone || '',
      })

      // 2. Find pipeline "nové zakázky" or use default
      let pipelineId: number | undefined
      let stageId: number | undefined

      try {
        const pipeline = await pipedriveClient.findPipelineByName('nové zakázky')
        if (pipeline) {
          pipelineId = pipeline.id
          const firstStage = await pipedriveClient.getFirstStage(pipeline.id)
          if (firstStage) {
            stageId = firstStage.id
          }
        }
      } catch {
        console.warn('Pipeline "nové zakázky" not found, using default')
      }

      // 3. Create deal
      const deal = await pipedriveClient.createDeal({
        title: `Konfigurace - ${config.contact_name}`,
        person_id: person.id,
        pipeline_id: pipelineId,
        stage_id: stageId,
        visible_to: 3,
        source: PIPEDRIVE_SOURCE_OPTIONS.KONFIGURATOR, // Set deal source to "Konfigurátor" (enum ID: 112)
      })

      // 4. Add note with configuration details
      try {
        await pipedriveClient.addNoteToDeal(deal.id, generateDealNote(config))
      } catch (err) {
        console.warn('Failed to add note to deal:', err)
      }

      // 5. Generate and add products to deal
      try {
        const quoteItems = await generateQuoteItemsFromConfiguration(config, supabase)

        const productsToAdd = quoteItems
          .filter(item => item.product_id)
          .map(async item => {
            const { data: product } = await supabase
              .from('products')
              .select('pipedrive_id')
              .eq('id', item.product_id)
              .single()

            if (product?.pipedrive_id) {
              return {
                product_id: product.pipedrive_id,
                item_price: item.unit_price,
                quantity: item.quantity,
              }
            }
            return null
          })

        const resolvedProducts = (await Promise.all(productsToAdd)).filter(
          (p): p is NonNullable<typeof p> => p !== null
        )

        if (resolvedProducts.length > 0) {
          await pipedriveClient.addProductsToDeal(deal.id, resolvedProducts)
        }
      } catch (err) {
        console.warn('Failed to add products to deal:', err)
      }

      // Log success
      await supabase.from('sync_log').insert({
        configuration_id: id,
        action: 'pipedrive_retry',
        status: 'success',
        response: { dealId: deal.id, personId: person.id },
      })

      // Update configuration
      await supabase
        .from('configurations')
        .update({
          pipedrive_status: 'success',
          pipedrive_deal_id: String(deal.id),
          pipedrive_person_id: person.id,
          pipedrive_synced_at: new Date().toISOString(),
          pipedrive_error: null,
        })
        .eq('id', id)

      revalidatePath('/admin/konfigurace')
      revalidatePath(`/admin/konfigurace/${id}`)
      revalidatePath('/admin/dashboard')

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'

      // Log error
      await supabase.from('sync_log').insert({
        configuration_id: id,
        action: 'pipedrive_retry',
        status: 'error',
        error_message: errorMessage,
      })

      await supabase
        .from('configurations')
        .update({
          pipedrive_status: 'error',
          pipedrive_error: errorMessage,
        })
        .eq('id', id)

      return { success: false, error: errorMessage }
    }
  } catch (error) {
    console.error('Error retrying Pipedrive sync:', error)
    return { success: false, error: 'Nepodařilo se odeslat do Pipedrive' }
  }
}

export async function resendConfigurationEmail(id: string) {
  try {
    // Admin only
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

    try {
      const emailData = configToEmailData(config)
      const html = generateConfigurationEmailHtml(emailData)
      const text = generateConfigurationEmailText(emailData)

      const result = await sendEmail({
        to: config.contact_email,
        subject: 'Vaše konfigurace bazénu - Rentmil',
        html,
        text,
        replyTo: 'info@rentmil.cz',
      })

      if (!result.success) {
        // Log error
        await supabase.from('sync_log').insert({
          configuration_id: id,
          action: 'email_resend',
          status: 'error',
          error_message: result.error,
        })

        await supabase
          .from('configurations')
          .update({ email_error: result.error })
          .eq('id', id)

        return { success: false, error: result.error }
      }

      // Log success
      await supabase.from('sync_log').insert({
        configuration_id: id,
        action: 'email_resend',
        status: 'success',
      })

      // Update configuration
      await supabase
        .from('configurations')
        .update({
          email_sent_at: new Date().toISOString(),
          email_error: null,
        })
        .eq('id', id)

      revalidatePath(`/admin/konfigurace/${id}`)

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'

      await supabase.from('sync_log').insert({
        configuration_id: id,
        action: 'email_resend',
        status: 'error',
        error_message: errorMessage,
      })

      await supabase
        .from('configurations')
        .update({ email_error: errorMessage })
        .eq('id', id)

      return { success: false, error: errorMessage }
    }
  } catch (error) {
    console.error('Error resending email:', error)
    return { success: false, error: 'Nepodařilo se odeslat email' }
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
    technology?: string
    lighting?: string
    counterflow?: string
    water_treatment?: string
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
  technology: string
  lighting: string
  counterflow: string
  water_treatment: string
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
