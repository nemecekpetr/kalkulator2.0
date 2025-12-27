'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfigurationSchema } from '@/lib/validations/configuration'
import { verifyTurnstile } from '@/lib/turnstile'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'
import { z } from 'zod'

// Response type
interface SubmitResult {
  success: boolean
  message: string
  configurationId?: string
}

// Send to Make.com webhook
async function sendToMake(configuration: z.infer<typeof ConfigurationSchema>, configId: string): Promise<boolean> {
  if (!process.env.MAKE_WEBHOOK_URL) {
    console.warn('Make webhook URL not configured')
    return false
  }

  try {
    const response = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configurationId: configId,
        timestamp: new Date().toISOString(),
        contact: {
          name: configuration.contact.name,
          email: configuration.contact.email,
          phone: configuration.contact.phone,
          address: configuration.contact.address || null,
        },
        pool: {
          shape: configuration.shape,
          type: configuration.type,
          dimensions: configuration.dimensions,
          color: configuration.color,
          stairs: configuration.stairs,
          technology: configuration.technology,
        },
        accessories: {
          lighting: configuration.lighting,
          counterflow: configuration.counterflow,
          waterTreatment: configuration.waterTreatment,
        },
        extras: {
          heating: configuration.heating,
          roofing: configuration.roofing,
        },
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/pipedrive-callback`,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Make webhook failed:', error)
    return false
  }
}

export async function submitConfiguration(
  formData: z.infer<typeof ConfigurationSchema>
): Promise<SubmitResult> {
  try {
    // 1. Rate limit check
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
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

    // 3. Verify Turnstile (if token provided)
    if (validatedData.turnstileToken) {
      const isValidTurnstile = await verifyTurnstile(validatedData.turnstileToken)
      if (!isValidTurnstile) {
        return {
          success: false,
          message: 'Ověření selhalo. Zkuste to prosím znovu.',
        }
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

    // 5. Sanitize user inputs
    const sanitizedName = sanitizeText(validatedData.contact.name)
    const sanitizedEmail = sanitizeEmail(validatedData.contact.email)
    const sanitizedPhone = sanitizePhone(validatedData.contact.phone)
    const sanitizedAddress = sanitizeText(validatedData.contact.address)

    if (!sanitizedName || !sanitizedEmail || !sanitizedPhone) {
      return {
        success: false,
        message: 'Neplatné kontaktní údaje.',
      }
    }

    // 6. Insert configuration into database
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
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Database insert failed:', insertError)
      return {
        success: false,
        message: `Nepodařilo se uložit konfiguraci: ${insertError.message}`,
      }
    }

    // 7. Send to Make.com webhook
    const webhookSuccess = await sendToMake(validatedData, configuration.id)

    // 8. Log the sync attempt
    await supabase.from('sync_log').insert({
      configuration_id: configuration.id,
      action: 'pipedrive_create',
      status: webhookSuccess ? 'success' : 'error',
      error_message: webhookSuccess ? null : 'Webhook call failed',
    })

    // 9. Update configuration status if webhook failed
    if (!webhookSuccess) {
      await supabase
        .from('configurations')
        .update({
          pipedrive_status: 'error',
          pipedrive_error: 'Failed to send to Make.com webhook',
        })
        .eq('id', configuration.id)
    }

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
