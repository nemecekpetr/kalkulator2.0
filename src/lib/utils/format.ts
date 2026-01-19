/**
 * Shared formatting utilities
 *
 * Centralized formatting functions for consistent display across the app.
 */

/**
 * Format price in Czech crowns (CZK)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Format date in Czech locale (long format)
 * Example: "15. ledna 2024"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format date in Czech locale (short format)
 * Example: "15. 1. 2024"
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date and time in Czech locale
 * Example: "15. ledna 2024, 14:30"
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format phone number for display
 * Adds spaces for readability: "+420 737 222 004"
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'
  // Already formatted
  if (phone.includes(' ')) return phone
  // Format Czech phone numbers
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 12 && cleaned.startsWith('420')) {
    return `+420 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)} %`
}
