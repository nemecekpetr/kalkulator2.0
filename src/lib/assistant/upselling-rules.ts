import type { Quote, QuoteItem, Product } from '@/lib/supabase/types'

export interface UpsellSuggestion {
  id: string
  priority: number
  message: string
  reason: string
  category: string
  recommendedProducts?: string[] // Product codes to suggest
  estimatedValue?: number
}

interface QuoteWithItems extends Quote {
  items?: (QuoteItem & { product?: Product | null })[]
}

/**
 * Analyzes a quote and returns upselling suggestions
 */
export function getUpsellingSuggestions(
  quote: QuoteWithItems
): UpsellSuggestion[] {
  const items = quote.items || []
  const suggestions: UpsellSuggestion[] = []

  // Run all rules
  for (const rule of upsellRules) {
    if (rule.condition(quote, items)) {
      suggestions.push({
        id: rule.id,
        priority: rule.priority,
        message: rule.message,
        reason: rule.reason,
        category: rule.category,
        recommendedProducts: rule.recommendedProducts,
        estimatedValue: rule.estimatedValue,
      })
    }
  }

  // Sort by priority (higher = more important)
  return suggestions.sort((a, b) => b.priority - a.priority)
}

// =============================================================================
// Upselling Rules
// =============================================================================

interface UpsellRule {
  id: string
  priority: number
  message: string
  reason: string
  category: string
  recommendedProducts?: string[]
  estimatedValue?: number
  condition: (quote: QuoteWithItems, items: (QuoteItem & { product?: Product | null })[]) => boolean
}

const upsellRules: UpsellRule[] = [
  // ===== TEPELNÁ ČERPADLA =====
  {
    id: 'heating_missing_large_pool',
    priority: 100,
    message: 'Doporučuji přidat tepelné čerpadlo',
    reason: 'Pro bazén této velikosti je tepelné čerpadlo ekonomicky výhodné - prodlouží koupací sezónu o 2-3 měsíce a návratnost investice je 3-4 roky.',
    category: 'ohrev',
    recommendedProducts: ['TC-15', 'TC-20', 'TC-25'],
    estimatedValue: 85000,
    condition: (quote, items) => {
      // Check if pool is large (estimated from items or configuration)
      const hasHeating = items.some(
        (i) => i.category === 'ohrev' || i.product?.category === 'ohrev'
      )
      if (hasHeating) return false

      // Check pool volume from configuration or estimate from price
      const poolItem = items.find(
        (i) => i.category === 'bazeny' || i.product?.category === 'bazeny'
      )
      if (poolItem && poolItem.total_price > 150000) {
        return true // Larger pools benefit more from heat pumps
      }

      return false
    },
  },
  {
    id: 'heating_missing_any_pool',
    priority: 70,
    message: 'Zvažte přidání ohřevu bazénu',
    reason: 'Bez ohřevu je koupací sezóna omezená na nejtepleji letní měsíce. Tepelné čerpadlo prodlouží využití bazénu.',
    category: 'ohrev',
    recommendedProducts: ['TC-10', 'TC-15'],
    estimatedValue: 55000,
    condition: (quote, items) => {
      const hasHeating = items.some(
        (i) => i.category === 'ohrev' || i.product?.category === 'ohrev'
      )
      return !hasHeating
    },
  },

  // ===== ZASTŘEŠENÍ =====
  {
    id: 'cover_missing',
    priority: 90,
    message: 'Nabídka neobsahuje zastřešení bazénu',
    reason: 'Zastřešení snižuje náklady na údržbu o 40%, zabraňuje znečištění a prodlužuje koupací sezónu. Je to investice, která se rychle vrátí.',
    category: 'zastreseni',
    recommendedProducts: ['ZASTR-ELEGANT', 'ZASTR-KLASIK'],
    estimatedValue: 120000,
    condition: (quote, items) => {
      const hasCover = items.some(
        (i) =>
          i.category === 'zastreseni' ||
          i.product?.category === 'zastreseni' ||
          i.name?.toLowerCase().includes('zastřešení') ||
          i.name?.toLowerCase().includes('zakrytí')
      )
      return !hasCover
    },
  },

  // ===== PROTIPROUD =====
  {
    id: 'counterflow_missing',
    priority: 60,
    message: 'Doporučuji zvážit protiproud',
    reason: 'Protiproud umožňuje sportovní plavání i v menším bazénu. Oblíbená volba pro aktivní zákazníky.',
    category: 'protiproud',
    recommendedProducts: ['PP-AQUA-JET', 'PP-TURBO'],
    estimatedValue: 35000,
    condition: (quote, items) => {
      const hasCounterflow = items.some(
        (i) => i.category === 'protiproud' || i.product?.category === 'protiproud'
      )
      // Only suggest for pools without counterflow
      return !hasCounterflow
    },
  },

  // ===== OSVĚTLENÍ =====
  {
    id: 'lighting_missing',
    priority: 50,
    message: 'Zvažte přidání LED osvětlení',
    reason: 'Podvodní LED osvětlení vytváří krásnou atmosféru pro večerní koupání a zvyšuje bezpečnost.',
    category: 'osvetleni',
    recommendedProducts: ['LED-RGB-SET', 'LED-WHITE'],
    estimatedValue: 15000,
    condition: (quote, items) => {
      const hasLighting = items.some(
        (i) =>
          i.category === 'osvetleni' ||
          i.product?.category === 'osvetleni' ||
          i.name?.toLowerCase().includes('světl') ||
          i.name?.toLowerCase().includes('led')
      )
      return !hasLighting
    },
  },

  // ===== ÚPRAVA VODY =====
  {
    id: 'water_treatment_upgrade',
    priority: 55,
    message: 'Zvažte automatickou úpravu vody',
    reason: 'Automatický dávkovač chemie šetří čas a zajišťuje vždy optimální kvalitu vody. Méně práce, více odpočinku.',
    category: 'uprava_vody',
    recommendedProducts: ['AUTO-CHLOR', 'SALT-SYSTEM'],
    estimatedValue: 25000,
    condition: (quote, items) => {
      const hasAutoTreatment = items.some(
        (i) =>
          (i.category === 'uprava_vody' || i.product?.category === 'uprava_vody') &&
          (i.name?.toLowerCase().includes('automat') ||
            i.name?.toLowerCase().includes('soln') ||
            i.name?.toLowerCase().includes('dávkov'))
      )
      // Suggest if no automatic treatment
      return !hasAutoTreatment
    },
  },

  // ===== SLUŽBY =====
  {
    id: 'installation_service',
    priority: 40,
    message: 'Nabídněte profesionální montáž',
    reason: 'Profesionální montáž zajistí správnou instalaci a záruku. Zákazník má jistotu, že bude vše fungovat.',
    category: 'sluzby',
    recommendedProducts: ['SERV-MONTAZ'],
    estimatedValue: 30000,
    condition: (quote, items) => {
      const hasInstallation = items.some(
        (i) =>
          i.category === 'sluzby' ||
          i.name?.toLowerCase().includes('montáž') ||
          i.name?.toLowerCase().includes('instalace')
      )
      return !hasInstallation
    },
  },

  // ===== PŘÍSLUŠENSTVÍ =====
  {
    id: 'ladder_missing',
    priority: 30,
    message: 'Přidejte bazénový žebřík',
    reason: 'Nerezový žebřík usnadňuje vstup do bazénu a je standardním příslušenstvím.',
    category: 'prislusenstvi',
    recommendedProducts: ['ZEBRIK-NEREZ-4', 'ZEBRIK-NEREZ-3'],
    estimatedValue: 8000,
    condition: (quote, items) => {
      const hasLadder = items.some(
        (i) =>
          i.name?.toLowerCase().includes('žebřík') ||
          i.name?.toLowerCase().includes('schůdky')
      )
      // Check if pool has internal stairs
      const hasInternalStairs = items.some(
        (i) =>
          i.category === 'schodiste' ||
          i.name?.toLowerCase().includes('schod')
      )
      return !hasLadder && !hasInternalStairs
    },
  },
]

/**
 * Get suggested products by category
 */
export function getSuggestedProductCodes(suggestions: UpsellSuggestion[]): string[] {
  const codes: string[] = []
  for (const suggestion of suggestions) {
    if (suggestion.recommendedProducts) {
      codes.push(...suggestion.recommendedProducts)
    }
  }
  return [...new Set(codes)] // Remove duplicates
}

/**
 * Calculate total potential upsell value
 */
export function calculateUpsellPotential(suggestions: UpsellSuggestion[]): number {
  return suggestions.reduce((sum, s) => sum + (s.estimatedValue || 0), 0)
}
