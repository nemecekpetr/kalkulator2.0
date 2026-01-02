import type { QuoteItemCategory } from '@/lib/supabase/types'

/**
 * Czech labels for quote/order item categories
 * Used in quote editor, quote detail, print views, and order views
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
