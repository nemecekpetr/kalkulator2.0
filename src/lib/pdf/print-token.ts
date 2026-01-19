/**
 * Token utility pro zabezpečení print pages
 *
 * Print pages jsou přístupné pouze s platným tokenem, který se generuje
 * při PDF requestu a má omezenou platnost (5 minut).
 *
 * Token je HMAC-SHA256 podpis obsahující:
 * - ID dokumentu
 * - Typ dokumentu (quote/order/production)
 * - Timestamp expirace
 */

import crypto from 'crypto'

// Token platí 5 minut
const TOKEN_EXPIRY_MS = 5 * 60 * 1000

// Secret pro podepisování - použít env proměnnou nebo fallback na SUPABASE_SERVICE_ROLE_KEY
function getSecret(): string {
  const secret = process.env.PDF_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('PDF_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return secret
}

interface TokenPayload {
  id: string
  type: 'quote' | 'order' | 'production'
  exp: number
}

/**
 * Generuje podepsaný token pro přístup k print page
 */
export function generatePrintToken(id: string, type: TokenPayload['type']): string {
  const payload: TokenPayload = {
    id,
    type,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  }

  const payloadString = JSON.stringify(payload)
  const payloadBase64 = Buffer.from(payloadString).toString('base64url')

  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payloadBase64)
    .digest('base64url')

  return `${payloadBase64}.${signature}`
}

/**
 * Ověřuje token a vrací payload pokud je platný
 */
export function verifyPrintToken(
  token: string | null | undefined,
  expectedId: string,
  expectedType: TokenPayload['type']
): { valid: true; payload: TokenPayload } | { valid: false; error: string } {
  if (!token) {
    return { valid: false, error: 'Token chybí' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'Neplatný formát tokenu' }
  }

  const [payloadBase64, signature] = parts

  // Ověřit podpis
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(payloadBase64)
    .digest('base64url')

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Neplatný podpis tokenu' }
  }

  // Dekódovat payload
  let payload: TokenPayload
  try {
    const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    payload = JSON.parse(payloadString)
  } catch {
    return { valid: false, error: 'Nepodařilo se dekódovat token' }
  }

  // Ověřit expiraci
  if (payload.exp < Date.now()) {
    return { valid: false, error: 'Token vypršel' }
  }

  // Ověřit ID a typ
  if (payload.id !== expectedId) {
    return { valid: false, error: 'Token neodpovídá požadovanému dokumentu' }
  }

  if (payload.type !== expectedType) {
    return { valid: false, error: 'Token neodpovídá typu dokumentu' }
  }

  return { valid: true, payload }
}

/**
 * Přidá token do URL jako query parametr
 */
export function addTokenToUrl(url: string, token: string): string {
  const urlObj = new URL(url)
  urlObj.searchParams.set('token', token)
  return urlObj.toString()
}
