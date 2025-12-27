/**
 * Quote Generator
 * Generates quote items from a pool configuration using mapping rules and product codes
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Configuration,
  GeneratedQuoteItem,
  ProductMappingRule,
  Product,
  QuoteItemCategory,
  PoolShape,
  PoolType,
} from '@/lib/supabase/types'

// Values that should be skipped (no product needed)
const SKIP_VALUES = ['none']

/**
 * Get the configuration value for a given field
 */
function getConfigValue(config: Configuration, field: string): string | null {
  // Handle accessories array - these are stored in the accessories field
  if (field === 'lighting' || field === 'counterflow' || field === 'waterTreatment') {
    const accessories = config.accessories || []
    // Check if the value is in accessories
    if (field === 'lighting') {
      return accessories.includes('led') ? 'led' : 'none'
    }
    if (field === 'counterflow') {
      return accessories.includes('with_counterflow') ? 'with_counterflow' : 'none'
    }
    if (field === 'waterTreatment') {
      // Check for chlorine or salt
      if (accessories.includes('salt')) return 'salt'
      if (accessories.includes('chlorine')) return 'chlorine'
      return 'chlorine' // default
    }
  }

  // Handle technology array
  if (field === 'technology') {
    const tech = config.technology || []
    if (tech.includes('shaft')) return 'shaft'
    if (tech.includes('wall')) return 'wall'
    if (tech.includes('other')) return 'other'
    return null
  }

  // Direct field mapping
  const value = (config as Record<string, unknown>)[field]
  if (typeof value === 'string') {
    return value
  }
  return null
}

/**
 * Check if a mapping rule matches the configuration
 */
function ruleMatchesConfig(
  rule: ProductMappingRule,
  config: Configuration
): boolean {
  // Get the config value for this rule's field
  const configValue = getConfigValue(config, rule.config_field)

  // Check if the value matches
  if (configValue !== rule.config_value) {
    return false
  }

  // Skip if value is in skip list
  if (SKIP_VALUES.includes(configValue)) {
    return false
  }

  // Check pool shape constraint
  if (rule.pool_shape && rule.pool_shape.length > 0) {
    if (!rule.pool_shape.includes(config.pool_shape as PoolShape)) {
      return false
    }
  }

  // Check pool type constraint
  if (rule.pool_type && rule.pool_type.length > 0) {
    if (!rule.pool_type.includes(config.pool_type as PoolType)) {
      return false
    }
  }

  return true
}

/**
 * Build product code for pool based on configuration
 * Format: BAZ-{SHAPE}-{TYPE}-{DIMENSIONS}
 * Examples:
 *   - BAZ-OBD-SK-3-6-1.2 (obdélník skimmer 3×6×1.2m)
 *   - BAZ-KRU-PR-3-1.5 (kruhový přeliv Ø3×1.5m)
 */
export function buildPoolProductCode(config: Configuration): string {
  const { pool_shape, pool_type, dimensions } = config

  // Shape code
  const shapeCode = pool_shape === 'circle' ? 'KRU' : 'OBD'

  // Type code
  const typeCode = pool_type === 'skimmer' ? 'SK' : 'PR'

  // Dimensions
  let dimensionCode: string
  if (pool_shape === 'circle') {
    // Circle: diameter-depth (e.g., 3-1.5)
    dimensionCode = `${dimensions.diameter}-${dimensions.depth}`
  } else {
    // Rectangle: width-length-depth (e.g., 3-6-1.2)
    dimensionCode = `${dimensions.width}-${dimensions.length}-${dimensions.depth}`
  }

  return `BAZ-${shapeCode}-${typeCode}-${dimensionCode}`
}

/**
 * Find the matching pool product by code
 */
async function findPoolProduct(
  config: Configuration,
  supabase: SupabaseClient
): Promise<Product | null> {
  const productCode = buildPoolProductCode(config)

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('code', productCode)
    .eq('active', true)
    .single()

  if (error || !data) {
    console.warn('Pool product not found for code:', productCode, {
      pool_shape: config.pool_shape,
      pool_type: config.pool_type,
      dimensions: config.dimensions,
    })
    return null
  }

  return data as Product
}

/**
 * Get all active mapping rules
 */
async function getMappingRules(
  supabase: SupabaseClient
): Promise<ProductMappingRule[]> {
  const { data, error } = await supabase
    .from('product_mapping_rules')
    .select('*, product:products(*)')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching mapping rules:', error)
    return []
  }

  return (data || []) as ProductMappingRule[]
}

/**
 * Generate quote items from a configuration
 */
export async function generateQuoteItemsFromConfiguration(
  config: Configuration,
  supabase: SupabaseClient
): Promise<GeneratedQuoteItem[]> {
  const items: GeneratedQuoteItem[] = []
  let sortOrder = 0

  // 1. Find and add pool product by code
  const poolProduct = await findPoolProduct(config, supabase)
  if (poolProduct) {
    items.push({
      product_id: poolProduct.id,
      name: poolProduct.name,
      description: poolProduct.description,
      category: poolProduct.category as QuoteItemCategory,
      quantity: 1,
      unit: poolProduct.unit || 'ks',
      unit_price: poolProduct.unit_price,
      total_price: poolProduct.unit_price,
      sort_order: sortOrder++,
      source: 'pool_base_price',
    })
  }

  // 2. Get and apply mapping rules
  const rules = await getMappingRules(supabase)

  for (const rule of rules) {
    // Check if rule matches configuration
    if (!ruleMatchesConfig(rule, config)) {
      continue
    }

    // Skip rules without assigned products
    if (!rule.product_id || !rule.product) {
      console.warn(`Mapping rule "${rule.name}" has no product assigned`)
      continue
    }

    const product = rule.product
    const quantity = rule.quantity || 1
    const unitPrice = product.unit_price
    const totalPrice = unitPrice * quantity

    items.push({
      product_id: product.id,
      name: product.name,
      description: product.description,
      category: product.category as QuoteItemCategory,
      quantity,
      unit: product.unit || 'ks',
      unit_price: unitPrice,
      total_price: totalPrice,
      sort_order: sortOrder++,
      source: 'mapping_rule',
      rule_id: rule.id,
    })
  }

  return items
}

/**
 * Calculate total from generated items
 */
export function calculateTotal(items: GeneratedQuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.total_price, 0)
}

/**
 * Format configuration for display in quote
 */
export function formatPoolConfigForQuote(config: Configuration): {
  shape: string
  type: string
  dimensions: string
  color: string
  stairs?: string
  technology?: string
} {
  const { pool_shape, pool_type, dimensions, color, stairs, technology } = config

  const shapeLabels: Record<string, string> = {
    circle: 'Kruhový',
    rectangle_rounded: 'Obdélník zaoblený',
    rectangle_sharp: 'Obdélník ostrý',
  }

  const typeLabels: Record<string, string> = {
    skimmer: 'Skimmerový',
    overflow: 'Přelivový',
  }

  let dimensionsStr: string
  if (pool_shape === 'circle') {
    dimensionsStr = `Ø${dimensions.diameter} × ${dimensions.depth} m`
  } else {
    dimensionsStr = `${dimensions.length} × ${dimensions.width} × ${dimensions.depth} m`
  }

  return {
    shape: shapeLabels[pool_shape] || pool_shape,
    type: typeLabels[pool_type] || pool_type,
    dimensions: dimensionsStr,
    color,
    stairs: stairs !== 'none' ? stairs : undefined,
    technology: technology?.[0],
  }
}
