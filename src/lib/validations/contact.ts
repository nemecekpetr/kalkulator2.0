/**
 * Centralized contact validation
 *
 * Single source of truth for email, phone, and contact validation.
 * Used by: StepContact (UI), configurator-store (canProceed), submit-configuration (server)
 */

// ============================================
// VALIDATION FUNCTIONS (pure, no side effects)
// ============================================

/**
 * Validate email format
 * - Must have @ and domain with TLD
 * - Max 254 chars (RFC 5321)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  if (email.length > 254) return false

  // Standard email regex - requires at least 2 characters for TLD
  // Rejects: test@test.c (1-char TLD)
  // Accepts: test@test.cz, test@test.com
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  return emailRegex.test(email.trim())
}

/**
 * Validate phone number
 * - Must have at least 9 digits (Czech phone numbers)
 * - Can contain +, spaces, dashes
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false

  // Count only digits
  const digitCount = phone.replace(/\D/g, '').length
  return digitCount >= 9
}

/**
 * Validate name
 * - Must have at least 2 characters after trimming
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  return name.trim().length >= 2
}

/**
 * Validate complete contact data
 */
export interface ContactValidation {
  isValid: boolean
  errors: {
    name?: string
    email?: string
    phone?: string
  }
}

export function validateContact(contact: {
  name?: string | null
  email?: string | null
  phone?: string | null
}): ContactValidation {
  const errors: ContactValidation['errors'] = {}

  if (!contact.name || !isValidName(contact.name)) {
    errors.name = 'Jméno musí mít alespoň 2 znaky'
  }

  if (!contact.email || !isValidEmail(contact.email)) {
    errors.email = 'Zadejte platný e-mail'
  }

  if (!contact.phone || !isValidPhone(contact.phone)) {
    errors.phone = 'Zadejte platné telefonní číslo (min. 9 číslic)'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Strip HTML tags from string
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize text input - strips HTML and trims
 * Returns null if result is empty
 */
export function sanitizeText(str: string | null | undefined): string | null {
  if (str === null || str === undefined) return null
  if (typeof str !== 'string') return null

  const sanitized = stripHtml(str).trim()
  return sanitized.length > 0 ? sanitized : null
}

/**
 * Sanitize and validate email
 * Returns null if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null

  const sanitized = email.toLowerCase().trim()

  // Validate after sanitization
  if (!isValidEmail(sanitized)) return null

  return sanitized
}

/**
 * Sanitize and validate phone number
 * - Preserves + at start
 * - Removes all other non-digit characters
 * Returns null if invalid (less than 9 digits)
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null

  // Preserve leading + if present, remove all other non-digits
  const hasPlus = phone.trim().startsWith('+')
  const digits = phone.replace(/\D/g, '')

  // Must have at least 9 digits
  if (digits.length < 9) return null

  return hasPlus ? `+${digits}` : digits
}

/**
 * Sanitize and validate complete contact
 * Returns sanitized data or null if any required field is invalid
 */
export function sanitizeContact(contact: {
  name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}): {
  name: string
  email: string
  phone: string
  address: string | null
} | null {
  const name = sanitizeText(contact.name)
  const email = sanitizeEmail(contact.email)
  const phone = sanitizePhone(contact.phone)
  const address = sanitizeText(contact.address)

  // Validate required fields
  if (!name || !isValidName(name)) return null
  if (!email) return null  // sanitizeEmail already validates
  if (!phone) return null  // sanitizePhone already validates

  return { name, email, phone, address }
}
