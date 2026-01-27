import type { ProductCategory, QuoteItemCategory } from '@/lib/supabase/types'

/**
 * Czech labels for product categories
 * Single source of truth - use this everywhere for consistency
 */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  skelety: 'Skelety',
  sety: 'Sety',
  schodiste: 'Schodiště',
  technologie: 'Technologie',
  osvetleni: 'Osvětlení',
  uprava_vody: 'Úprava vody',
  protiproud: 'Protiproud',
  ohrev: 'Ohřev',
  material: 'Materiál',
  priplatky: 'Příplatky',
  chemie: 'Chemie',
  zatepleni: 'Zateplení',
  vysavace: 'Vysavače',
  sluzby: 'Služby',
  doprava: 'Doprava',
  jine: 'Jiné',
}

/**
 * CSS classes for category badge colors
 */
export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  skelety: 'bg-blue-100 text-blue-800',
  sety: 'bg-violet-100 text-violet-800',
  schodiste: 'bg-amber-100 text-amber-800',
  technologie: 'bg-indigo-100 text-indigo-800',
  osvetleni: 'bg-yellow-100 text-yellow-800',
  uprava_vody: 'bg-cyan-100 text-cyan-800',
  protiproud: 'bg-sky-100 text-sky-800',
  ohrev: 'bg-red-100 text-red-800',
  material: 'bg-stone-100 text-stone-800',
  priplatky: 'bg-pink-100 text-pink-800',
  chemie: 'bg-lime-100 text-lime-800',
  zatepleni: 'bg-orange-100 text-orange-800',
  vysavace: 'bg-teal-100 text-teal-800',
  sluzby: 'bg-purple-100 text-purple-800',
  doprava: 'bg-green-100 text-green-800',
  jine: 'bg-gray-100 text-gray-800',
}

/**
 * Czech labels for quote/order item categories
 * Extends product categories with 'prace' (work/labor)
 */
export const QUOTE_CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  ...PRODUCT_CATEGORY_LABELS,
  prace: 'Práce',
}

/**
 * Ordered list of categories for display in UI
 * Most important/common categories first
 */
export const QUOTE_CATEGORY_ORDER: QuoteItemCategory[] = [
  'skelety',
  'sety',
  'schodiste',
  'technologie',
  'osvetleni',
  'protiproud',
  'uprava_vody',
  'ohrev',
  'material',
  'priplatky',
  'zatepleni',
  'vysavace',
  'chemie',
  'sluzby',
  'prace',
  'doprava',
  'jine',
]

/**
 * All valid quote item categories as array (for Zod schema, selects, etc.)
 */
export const QUOTE_CATEGORIES: QuoteItemCategory[] = [
  'skelety',
  'sety',
  'schodiste',
  'technologie',
  'osvetleni',
  'uprava_vody',
  'protiproud',
  'ohrev',
  'material',
  'priplatky',
  'chemie',
  'zatepleni',
  'vysavace',
  'sluzby',
  'doprava',
  'jine',
  'prace',
]
