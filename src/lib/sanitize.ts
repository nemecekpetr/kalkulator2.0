/**
 * Input sanitization utilities for XSS protection
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return str

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Strip all HTML tags from string
 */
export function stripHtml(str: string): string {
  if (!str || typeof str !== 'string') return str

  return str.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize user input - strips HTML and trims whitespace
 * Use this for text fields that should never contain HTML
 */
export function sanitizeText(str: string | null | undefined): string | null {
  if (str === null || str === undefined) return null
  if (typeof str !== 'string') return null

  return stripHtml(str).trim()
}

/**
 * Sanitize object - recursively sanitize all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj

  const result = { ...obj }

  for (const key in result) {
    const value = result[key]

    if (typeof value === 'string') {
      result[key] = sanitizeText(value) as T[Extract<keyof T, string>]
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>) as T[Extract<keyof T, string>]
    }
  }

  return result
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null

  const sanitized = email.toLowerCase().trim()

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) return null

  return sanitized
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null

  // Remove all non-digit characters except + at start
  const sanitized = phone.replace(/(?!^\+)[^\d]/g, '').trim()

  // Must have at least 9 digits
  if (sanitized.replace(/\D/g, '').length < 9) return null

  return sanitized
}
