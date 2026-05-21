/**
 * Sdílené pomocné funkce pro mapování dat konfigurátoru na řádek tabulky `configurations`.
 * Používají je server actions submitConfiguration i saveDraftConfiguration.
 */

import crypto from 'crypto'
import type { z } from 'zod'
import type { ConfigurationSchema } from '@/lib/validations/configuration'

type ConfigurationForm = z.infer<typeof ConfigurationSchema>

interface SanitizedContact {
  name: string
  email: string
  phone: string | null
  address: string | null
}

// Délka zkráceného SHA-256 hashe pro idempotency klíč
const IDEMPOTENCY_KEY_LENGTH = 32

/**
 * Vygeneruje idempotency klíč z e-mailu a základních parametrů bazénu.
 * Stejný klíč → stejná konfigurace; slouží k detekci duplicit a k propojení
 * draftu s jeho finálním odesláním.
 */
export function generateIdempotencyKey(data: {
  email: string
  shape: string
  type: string
  dimensions: Record<string, number | undefined>
}): string {
  const payload = JSON.stringify({
    email: data.email.toLowerCase(),
    shape: data.shape,
    type: data.type,
    dimensions: data.dimensions,
  })
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, IDEMPOTENCY_KEY_LENGTH)
}

/**
 * Sestaví pole konfigurace + kontaktu pro insert/update do tabulky `configurations`.
 * Vrací jen společná datová pole — volající doplní `is_draft`, `source`,
 * `idempotency_key`, `pipedrive_status` apod.
 */
export function buildConfigurationFields(data: ConfigurationForm, contact: SanitizedContact) {
  return {
    contact_name: contact.name,
    contact_email: contact.email,
    contact_phone: contact.phone,
    contact_address: contact.address,
    pool_shape: data.shape,
    pool_type: data.type,
    dimensions: data.dimensions,
    color: data.color,
    stairs: data.stairs,
    technology: data.technology,
    lighting: data.lighting,
    counterflow: data.counterflow,
    water_treatment: data.waterTreatment,
    heating: data.heating,
    roofing: data.roofing,
  }
}
