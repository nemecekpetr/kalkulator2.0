import type { ProductCategory, QuoteItemCategory } from '@/lib/supabase/types'

/**
 * Czech labels for product categories
 * Single source of truth - use this everywhere for consistency
 */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  bazeny: 'Bazény',
  zastreseni: 'Zastřešení',
  sluzby: 'Služby',
  doprava: 'Doprava',
  prislusenstvi: 'Příslušenství',
  schodiste: 'Schodiště',
  uprava_vody: 'Úprava vody',
  protiproud: 'Protiproud',
  technologie: 'Technologie',
  material: 'Materiál',
  ohrev: 'Ohřev',
  osvetleni: 'Osvětlení',
  cisteni: 'Čištění',
  chemie: 'Chemie',
  jine: 'Jiné',
  sety: 'Sety',
}

/**
 * CSS classes for category badge colors
 */
export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  bazeny: 'bg-blue-100 text-blue-800',
  zastreseni: 'bg-slate-100 text-slate-800',
  sluzby: 'bg-orange-100 text-orange-800',
  doprava: 'bg-green-100 text-green-800',
  prislusenstvi: 'bg-purple-100 text-purple-800',
  schodiste: 'bg-amber-100 text-amber-800',
  uprava_vody: 'bg-cyan-100 text-cyan-800',
  protiproud: 'bg-sky-100 text-sky-800',
  technologie: 'bg-indigo-100 text-indigo-800',
  material: 'bg-stone-100 text-stone-800',
  ohrev: 'bg-red-100 text-red-800',
  osvetleni: 'bg-yellow-100 text-yellow-800',
  cisteni: 'bg-teal-100 text-teal-800',
  chemie: 'bg-lime-100 text-lime-800',
  jine: 'bg-gray-100 text-gray-800',
  sety: 'bg-violet-100 text-violet-800',
}

/**
 * Czech labels for quote/order item categories
 * Extends product categories with 'prace' (work/labor)
 */
export const QUOTE_CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazény',
  zastreseni: 'Zastřešení',
  sluzby: 'Služby',
  doprava: 'Doprava',
  prislusenstvi: 'Příslušenství',
  schodiste: 'Schodiště',
  uprava_vody: 'Úprava vody',
  protiproud: 'Protiproud',
  technologie: 'Technologie',
  material: 'Materiál',
  ohrev: 'Ohřev',
  osvetleni: 'Osvětlení',
  cisteni: 'Čištění',
  chemie: 'Chemie',
  jine: 'Jiné',
  sety: 'Sety',
  prace: 'Práce',
}

/**
 * Ordered list of categories for display in UI
 * Most important/common categories first
 */
export const QUOTE_CATEGORY_ORDER: QuoteItemCategory[] = [
  'bazeny',
  'schodiste',
  'technologie',
  'osvetleni',
  'protiproud',
  'uprava_vody',
  'ohrev',
  'zastreseni',
  'prislusenstvi',
  'cisteni',
  'chemie',
  'material',
  'sluzby',
  'prace',
  'doprava',
  'sety',
  'jine',
]

/**
 * All valid quote item categories as array (for Zod schema, selects, etc.)
 */
export const QUOTE_CATEGORIES: QuoteItemCategory[] = [
  'bazeny',
  'zastreseni',
  'sluzby',
  'doprava',
  'prislusenstvi',
  'schodiste',
  'uprava_vody',
  'protiproud',
  'technologie',
  'material',
  'ohrev',
  'osvetleni',
  'cisteni',
  'chemie',
  'jine',
  'sety',
  'prace',
]
