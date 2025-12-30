'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfigurationSchema } from '@/lib/validations/configuration'
import { sanitizeContact, sanitizeText } from '@/lib/validations/contact'
import { verifyTurnstile } from '@/lib/turnstile'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/client'
import {
  configToEmailData,
  generateConfigurationEmailHtml,
  generateConfigurationEmailText,
} from '@/lib/email/templates/configuration-confirmation'
import { createPipedriveDealsClient } from '@/lib/pipedrive/deals'
import { generateQuoteItemsFromConfiguration } from '@/lib/quote-generator'
import { isPipedriveConfigured } from '@/lib/env'
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
import { z } from 'zod'
import crypto from 'crypto'

// Response type
interface SubmitResult {
  success: boolean
  message: string
  configurationId?: string
}

// Length of idempotency key hash (SHA-256 truncated)
const IDEMPOTENCY_KEY_LENGTH = 32

// Idempotency window in minutes (prevent duplicate submits within this time)
const IDEMPOTENCY_WINDOW_MINUTES = 5

// Generate idempotency key from form data
function generateIdempotencyKey(data: {
  email: string
  shape: string
  type: string
  dimensions: Record<string, number>
}): string {
  const payload = JSON.stringify({
    email: data.email.toLowerCase(),
    shape: data.shape,
    type: data.type,
    dimensions: data.dimensions,
  })
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, IDEMPOTENCY_KEY_LENGTH)
}

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

// Process Pipedrive integration
async function processPipedrive(
  config: Configuration,
  supabase: Awaited<ReturnType<typeof createAdminClient>>
): Promise<{ success: boolean; dealId?: number; personId?: number; error?: string }> {
  // Check if Pipedrive is configured
  if (!isPipedriveConfigured()) {
    console.warn('Pipedrive not configured, skipping integration')
    return {
      success: false,
      error: 'Pipedrive not configured',
    }
  }

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
      // Use default pipeline if not found
      console.warn('Pipeline "nové zakázky" not found, using default')
    }

    // 3. Create deal
    const deal = await pipedriveClient.createDeal({
      title: `Konfigurace - ${config.contact_name}`,
      person_id: person.id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      visible_to: 3, // Owner's visibility group
    })

    // 4. Add note with configuration details
    try {
      await pipedriveClient.addNoteToDeal(deal.id, generateDealNote(config))
    } catch (err) {
      console.warn('Failed to add note to deal:', err)
    }

    // 5. Generate and add products to deal (with N+1 fix)
    try {
      const quoteItems = await generateQuoteItemsFromConfiguration(config, supabase)

      // Filter items that have product_id in our DB
      const itemsWithProductId = quoteItems.filter(item => item.product_id)

      if (itemsWithProductId.length > 0) {
        // Batch fetch all products in one query (N+1 fix)
        const productIds = itemsWithProductId.map(item => item.product_id)
        const { data: products } = await supabase
          .from('products')
          .select('id, pipedrive_id')
          .in('id', productIds)

        // Create a map for quick lookup
        const productMap = new Map(
          (products || []).map(p => [p.id, p.pipedrive_id])
        )

        // Build products to add
        const productsToAdd = itemsWithProductId
          .map(item => {
            const pipedriveId = productMap.get(item.product_id)
            if (pipedriveId) {
              return {
                product_id: pipedriveId,
                item_price: item.unit_price,
                quantity: item.quantity,
              }
            }
            return null
          })
          .filter((p): p is NonNullable<typeof p> => p !== null)

        if (productsToAdd.length > 0) {
          const result = await pipedriveClient.addProductsToDeal(deal.id, productsToAdd)
          if (result.failed > 0) {
            console.warn(`Failed to add ${result.failed} products:`, result.errors)
          }
        }
      }
    } catch (err) {
      // Products are optional, don't fail the whole flow
      console.warn('Failed to add products to deal:', err)
    }

    return {
      success: true,
      dealId: deal.id,
      personId: person.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Pipedrive error'
    console.error('Pipedrive integration failed:', errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Process email sending
async function processEmail(
  config: Configuration
): Promise<{ success: boolean; error?: string }> {
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
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error'
    console.error('Email sending failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function submitConfiguration(
  formData: z.infer<typeof ConfigurationSchema>
): Promise<SubmitResult> {
  try {
    // 1. Rate limit check
    // Railway/Vercel sets x-forwarded-for header from the real client IP
    // Trust order: x-forwarded-for (first IP) > x-real-ip > 'unknown'
    // NOTE: If behind multiple proxies, first IP might be spoofed - rely on platform's proxy chain
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               headersList.get('x-real-ip') ||
               'unknown'

    const rateLimitResult = await checkRateLimit(ip)
    if (!rateLimitResult.success) {
      return {
        success: false,
        message: 'Příliš mnoho pokusů. Zkuste to prosím za chvíli.',
      }
    }

    // 2. Validate input
    let validatedData
    try {
      validatedData = ConfigurationSchema.parse(formData)
    } catch (validationError) {
      console.error('Validation error:', validationError)
      if (validationError instanceof z.ZodError) {
        const fieldErrors = validationError.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        return {
          success: false,
          message: `Neplatná data: ${fieldErrors}`,
        }
      }
      throw validationError
    }

    // 3. Verify Turnstile (optional - we have rate limiting + idempotency as backup)
    // TODO: Re-enable after Cloudflare Turnstile domain config is fixed for iframe embedding
    if (validatedData.turnstileToken) {
      const isValidTurnstile = await verifyTurnstile(validatedData.turnstileToken)
      if (!isValidTurnstile) {
        console.warn('Turnstile verification failed, but continuing (other protections in place)')
        // Don't block - we have rate limiting and idempotency
      }
    }

    // 4. Get Supabase client
    let supabase
    try {
      supabase = await createAdminClient()
    } catch (clientError) {
      console.error('Supabase client error:', clientError)
      return {
        success: false,
        message: 'Chyba připojení k databázi. Zkuste to prosím znovu.',
      }
    }

    // 5. Sanitize and validate user inputs (using centralized contact validation)
    const sanitizedContactData = sanitizeContact(validatedData.contact)

    if (!sanitizedContactData) {
      return {
        success: false,
        message: 'Neplatné kontaktní údaje.',
      }
    }

    const { name: sanitizedName, email: sanitizedEmail, phone: sanitizedPhone, address: sanitizedAddress } = sanitizedContactData

    // 6. Idempotency check - prevent duplicate submissions
    const idempotencyKey = generateIdempotencyKey({
      email: sanitizedEmail,
      shape: validatedData.shape,
      type: validatedData.type,
      dimensions: validatedData.dimensions,
    })

    // Check for recent duplicate submission
    const idempotencyWindow = new Date()
    idempotencyWindow.setMinutes(idempotencyWindow.getMinutes() - IDEMPOTENCY_WINDOW_MINUTES)

    const { data: existingConfig } = await supabase
      .from('configurations')
      .select('id, created_at')
      .eq('idempotency_key', idempotencyKey)
      .gte('created_at', idempotencyWindow.toISOString())
      .maybeSingle()

    if (existingConfig) {
      console.warn(`Duplicate submission detected for idempotency key: ${idempotencyKey}`)
      return {
        success: true, // Return success to not confuse user
        message: 'Konfigurace byla úspěšně odeslána!',
        configurationId: existingConfig.id,
      }
    }

    // 7. Insert configuration into database
    const { data: configuration, error: insertError } = await supabase
      .from('configurations')
      .insert({
        contact_name: sanitizedName,
        contact_email: sanitizedEmail,
        contact_phone: sanitizedPhone,
        contact_address: sanitizedAddress,
        pool_shape: validatedData.shape,
        pool_type: validatedData.type,
        dimensions: validatedData.dimensions,
        color: validatedData.color,
        stairs: validatedData.stairs,
        technology: validatedData.technology,
        lighting: validatedData.lighting,
        counterflow: validatedData.counterflow,
        water_treatment: validatedData.waterTreatment,
        heating: validatedData.heating,
        roofing: validatedData.roofing,
        pipedrive_status: 'pending',
        source: 'web',
        idempotency_key: idempotencyKey,
      })
      .select('*')
      .single()

    if (insertError || !configuration) {
      // Handle unique constraint violation (race condition fallback)
      // PostgreSQL error code 23505 = unique_violation
      if (insertError?.code === '23505') {
        console.warn(`Race condition duplicate caught by DB constraint: ${idempotencyKey}`)
        return {
          success: true,
          message: 'Konfigurace byla úspěšně odeslána!',
          // Don't expose internal key to user
        }
      }

      console.error('Database insert failed:', insertError)
      return {
        success: false,
        message: `Nepodařilo se uložit konfiguraci: ${insertError?.message}`,
      }
    }

    // 7. Process Pipedrive integration
    const pipedriveResult = await processPipedrive(configuration, supabase)

    // 8. Log Pipedrive attempt
    await supabase.from('sync_log').insert({
      configuration_id: configuration.id,
      action: 'pipedrive_create',
      status: pipedriveResult.success ? 'success' : 'error',
      error_message: pipedriveResult.error || null,
      response: pipedriveResult.success
        ? { dealId: pipedriveResult.dealId, personId: pipedriveResult.personId }
        : null,
    })

    // 9. Update configuration with Pipedrive result
    const pipedriveUpdate: Record<string, unknown> = {
      pipedrive_status: pipedriveResult.success ? 'success' : 'error',
    }

    if (pipedriveResult.success) {
      pipedriveUpdate.pipedrive_deal_id = String(pipedriveResult.dealId)
      pipedriveUpdate.pipedrive_person_id = pipedriveResult.personId
      pipedriveUpdate.pipedrive_synced_at = new Date().toISOString()
      pipedriveUpdate.pipedrive_error = null
    } else {
      pipedriveUpdate.pipedrive_error = pipedriveResult.error
    }

    await supabase
      .from('configurations')
      .update(pipedriveUpdate)
      .eq('id', configuration.id)

    // 10. Send confirmation email
    const emailResult = await processEmail(configuration)

    // 11. Update configuration with email result
    if (emailResult.success) {
      await supabase
        .from('configurations')
        .update({
          email_sent_at: new Date().toISOString(),
          email_error: null,
        })
        .eq('id', configuration.id)
    } else {
      await supabase
        .from('configurations')
        .update({
          email_error: emailResult.error,
        })
        .eq('id', configuration.id)
    }

    // Log email attempt
    await supabase.from('sync_log').insert({
      configuration_id: configuration.id,
      action: 'email_send',
      status: emailResult.success ? 'success' : 'error',
      error_message: emailResult.error || null,
    })

    return {
      success: true,
      message: 'Konfigurace byla úspěšně odeslána!',
      configurationId: configuration.id,
    }
  } catch (error) {
    console.error('Submit configuration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
    return {
      success: false,
      message: `Došlo k neočekávané chybě: ${errorMessage}`,
    }
  }
}
