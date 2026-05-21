'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfigurationSchema } from '@/lib/validations/configuration'
import type { PoolDimensions } from '@/lib/validations/configuration'
import { sanitizeContact } from '@/lib/validations/contact'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateIdempotencyKey, buildConfigurationFields } from '@/lib/configuration-mapping'
import type { Configuration } from '@/lib/supabase/types'

interface SaveDraftResult {
  success: boolean
  draftId?: string
}

interface LoadDraftResult {
  success: boolean
  configuration?: {
    shape: string
    type: string
    dimensions: Partial<PoolDimensions>
    color: string
    stairs: string
    technology: string
    lighting: string
    counterflow: string
    waterTreatment: string
    heating: string
    roofing: string
    contact: {
      name: string
      email: string
      phone: string
      address: string
    }
  }
}

function getClientIp(headersList: Headers): string {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Uloží rozpracovanou konfiguraci jako draft (volá se při přechodu z kroku 10 na 11).
 * Fire-and-forget — selhání nesmí blokovat průchod konfigurátorem.
 *
 * Připomínkový e-mail se NEodesílá automaticky — posílá se ručně z administrace
 * (viz `sendConfigurationReminder`), aby o příjemci rozhodoval člověk.
 */
export async function saveDraftConfiguration(
  formData: z.infer<typeof ConfigurationSchema>,
  draftId?: string | null
): Promise<SaveDraftResult> {
  try {
    // Rate limit dle IP
    const headersList = await headers()
    const rateLimit = await checkRateLimit(getClientIp(headersList))
    if (!rateLimit.success) return { success: false }

    // Validace + sanitizace
    const validated = ConfigurationSchema.parse(formData)
    const sanitized = sanitizeContact(validated.contact)
    if (!sanitized) return { success: false }

    const supabase = await createAdminClient()
    const idempotencyKey = generateIdempotencyKey({
      email: sanitized.email,
      shape: validated.shape,
      type: validated.type,
      dimensions: validated.dimensions,
    })
    const fields = buildConfigurationFields(validated, sanitized)

    // Najdi existující řádek — nejdřív podle draftId, pak podle idempotency klíče
    let existing: Configuration | null = null
    if (draftId) {
      const { data } = await supabase
        .from('configurations')
        .select('*')
        .eq('id', draftId)
        .maybeSingle()
      existing = data as Configuration | null
    }
    if (!existing) {
      const { data } = await supabase
        .from('configurations')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      existing = data as Configuration | null
    }

    // Konfigurace už byla odeslaná — draft není potřeba
    if (existing && !existing.is_draft) {
      return { success: true, draftId: existing.id }
    }

    if (existing) {
      // UPDATE existujícího draftu — přepsat aktuální data (klíč přepočítat,
      // uživatel mohl mezi krokem 10 a 11 změnit e-mail)
      const { data, error } = await supabase
        .from('configurations')
        .update({ ...fields, idempotency_key: idempotencyKey })
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error || !data) return { success: false }
      return { success: true, draftId: data.id }
    }

    // INSERT nového draftu
    const { data, error } = await supabase
      .from('configurations')
      .insert({
        ...fields,
        is_draft: true,
        was_draft: true,
        pipedrive_status: 'pending',
        source: 'web',
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single()

    if (error || !data) {
      // Race condition — draft se stejným klíčem mezitím vznikl
      if (error?.code === '23505') {
        const { data: raced } = await supabase
          .from('configurations')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        if (raced) return { success: true, draftId: raced.id }
      }
      return { success: false }
    }

    return { success: true, draftId: data.id }
  } catch (error) {
    console.error('saveDraftConfiguration error:', error)
    return { success: false }
  }
}

/**
 * Načte uloženou konfiguraci pro předvyplnění konfigurátoru z odkazu `?draft=<id>`.
 */
export async function loadDraftConfiguration(id: string): Promise<LoadDraftResult> {
  try {
    if (!z.string().uuid().safeParse(id).success) {
      return { success: false }
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error || !data) return { success: false }

    const config = data as Configuration

    return {
      success: true,
      configuration: {
        shape: config.pool_shape,
        type: config.pool_type,
        dimensions: config.dimensions,
        color: config.color,
        stairs: config.stairs,
        technology: config.technology,
        lighting: config.lighting,
        counterflow: config.counterflow,
        waterTreatment: config.water_treatment,
        heating: config.heating,
        roofing: config.roofing,
        contact: {
          name: config.contact_name,
          email: config.contact_email,
          phone: config.contact_phone || '',
          address: config.contact_address || '',
        },
      },
    }
  } catch (error) {
    console.error('loadDraftConfiguration error:', error)
    return { success: false }
  }
}
