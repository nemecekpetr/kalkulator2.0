/**
 * Quote Generator
 * Generates quote items from a pool configuration using mapping rules and product codes
 * Supports dynamic pricing: fixed, percentage-based, and surface coefficient pricing
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
  PoolDimensions,
} from '@/lib/supabase/types'

// Map legacy category names to new ones for backwards compatibility
const LEGACY_CATEGORY_MAP: Record<string, QuoteItemCategory> = {
  bazeny: 'skelety',
  prislusenstvi: 'jine',
}

// Normalize category - map legacy to new, pass through valid ones
function normalizeCategory(category: string): QuoteItemCategory {
  if (LEGACY_CATEGORY_MAP[category]) {
    return LEGACY_CATEGORY_MAP[category]
  }
  return category as QuoteItemCategory
}
import {
  calculateProductPrice,
  buildPriceContext,
  roundPrice,
  type PriceContext,
} from '@/lib/pricing/calculate-price'

// Values that should be skipped (no product needed)
const SKIP_VALUES = ['none']

/**
 * Get the configuration value for a given field
 */
function getConfigValue(config: Configuration, field: string): string | null {
  // Handle field name mapping (waterTreatment -> water_treatment)
  const fieldMap: Record<string, keyof Configuration> = {
    lighting: 'lighting',
    counterflow: 'counterflow',
    waterTreatment: 'water_treatment',
    technology: 'technology',
    stairs: 'stairs',
    heating: 'heating',
    roofing: 'roofing',
  }

  const dbField = fieldMap[field] || field

  // Direct field mapping - all fields are now individual strings
  const value = config[dbField as keyof Configuration]
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
 * Get all active products for price context building
 */
async function getAllProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)

  if (error) {
    console.error('Error fetching products for price context:', error)
    return []
  }

  return (data || []) as Product[]
}

/**
 * Calculate the actual price for a product using the pricing engine
 */
function getProductPrice(
  product: Product,
  priceContext: PriceContext
): number {
  if (!product.price_type || product.price_type === 'fixed') {
    return product.unit_price
  }

  const calculated = calculateProductPrice(product, priceContext)
  return roundPrice(calculated.price)
}

/**
 * Collect all required surcharge product IDs from a list of products
 * Now supports recursive collection - if surcharge A requires surcharge B, both are collected
 */
function collectRequiredSurcharges(
  products: Product[],
  addedProductIds: Set<string>,
  allProducts: Product[]
): string[] {
  const surchargeIds = new Set<string>()
  const processedIds = new Set<string>()
  const MAX_DEPTH = 10 // Prevent infinite loops from circular dependencies

  // Initial collection from input products
  const toProcess: string[] = []
  for (const product of products) {
    if (product.required_surcharge_ids?.length) {
      for (const surchargeId of product.required_surcharge_ids) {
        if (!addedProductIds.has(surchargeId) && !surchargeIds.has(surchargeId)) {
          surchargeIds.add(surchargeId)
          toProcess.push(surchargeId)
        }
      }
    }
  }

  // Recursively collect surcharges from surcharges
  let depth = 0
  while (toProcess.length > 0 && depth < MAX_DEPTH) {
    depth++
    const currentBatch = [...toProcess]
    toProcess.length = 0 // Clear the array

    for (const surchargeId of currentBatch) {
      if (processedIds.has(surchargeId)) continue
      processedIds.add(surchargeId)

      // Find the surcharge product to check its required_surcharge_ids
      const surchargeProduct = allProducts.find((p) => p.id === surchargeId)
      if (surchargeProduct?.required_surcharge_ids?.length) {
        for (const nestedSurchargeId of surchargeProduct.required_surcharge_ids) {
          if (
            !addedProductIds.has(nestedSurchargeId) &&
            !surchargeIds.has(nestedSurchargeId)
          ) {
            surchargeIds.add(nestedSurchargeId)
            toProcess.push(nestedSurchargeId)
          }
        }
      }
    }
  }

  if (depth >= MAX_DEPTH && toProcess.length > 0) {
    console.warn(
      'Surcharge collection hit max depth - possible circular dependency in required_surcharge_ids'
    )
  }

  return Array.from(surchargeIds)
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
  const addedProductIds = new Set<string>()

  // Get pool dimensions for pricing context
  const poolDimensions: PoolDimensions = config.dimensions
  const poolShape = config.pool_shape as PoolShape

  // Get all products for building price context
  const allProducts = await getAllProducts(supabase)

  // Build price context with pool dimensions
  const priceContext = buildPriceContext(allProducts, poolShape, poolDimensions)

  // Track products added for surcharge collection
  const addedProducts: Product[] = []

  // 1. Find and add pool product by code
  const poolProduct = await findPoolProduct(config, supabase)
  if (poolProduct) {
    const unitPrice = getProductPrice(poolProduct, priceContext)

    items.push({
      product_id: poolProduct.id,
      name: poolProduct.name,
      description: poolProduct.description,
      category: normalizeCategory(poolProduct.category),
      quantity: 1,
      unit: poolProduct.unit || 'ks',
      unit_price: unitPrice,
      total_price: unitPrice,
      sort_order: sortOrder++,
      source: 'pool_base_price',
    })

    addedProductIds.add(poolProduct.id)
    addedProducts.push(poolProduct)

    // Update price context with pool price (for percentage calculations)
    priceContext.productPrices.set(poolProduct.id, unitPrice)
  }

  // 2. Get and apply mapping rules
  const rules = await getMappingRules(supabase)

  for (const rule of rules) {
    // Check if rule matches configuration
    if (!ruleMatchesConfig(rule, config)) {
      continue
    }

    // Skip rules without assigned products
    const product = rule.product
    if (!rule.product_id || !product) {
      console.warn(`Mapping rule "${rule.name}" has no product assigned`)
      continue
    }

    // Skip if product already added
    if (addedProductIds.has(product.id)) {
      continue
    }

    const quantity = rule.quantity || 1
    const unitPrice = getProductPrice(product, priceContext)
    const totalPrice = unitPrice * quantity

    items.push({
      product_id: product.id,
      name: product.name,
      description: product.description,
      category: normalizeCategory(product.category),
      quantity,
      unit: product.unit || 'ks',
      unit_price: unitPrice,
      total_price: totalPrice,
      sort_order: sortOrder++,
      source: 'mapping_rule',
      rule_id: rule.id,
    })

    addedProductIds.add(product.id)
    addedProducts.push(product)

    // Update price context for potential dependent products
    priceContext.productPrices.set(product.id, unitPrice)
  }

  // 3. Add required surcharges (products that must be added when other products are selected)
  // Recursively collects surcharges - if surcharge A requires surcharge B, both are added
  const surchargeIds = collectRequiredSurcharges(addedProducts, addedProductIds, allProducts)

  if (surchargeIds.length > 0) {
    // Fetch surcharge products
    const { data: surchargeProducts } = await supabase
      .from('products')
      .select('*')
      .in('id', surchargeIds)
      .eq('active', true)

    if (surchargeProducts) {
      for (const surcharge of surchargeProducts as Product[]) {
        const unitPrice = getProductPrice(surcharge, priceContext)

        items.push({
          product_id: surcharge.id,
          name: surcharge.name,
          description: surcharge.description,
          category: normalizeCategory(surcharge.category),
          quantity: 1,
          unit: surcharge.unit || 'ks',
          unit_price: unitPrice,
          total_price: unitPrice,
          sort_order: sortOrder++,
          source: 'required_surcharge',
        })

        addedProductIds.add(surcharge.id)
      }
    }
  }

  // 4. Always add delivery item at the end (0 Kč = Zdarma by default)
  const hasDelivery = items.some((item) => item.category === 'doprava')
  if (!hasDelivery) {
    items.push({
      product_id: null,
      name: 'Doprava',
      description: null,
      category: 'doprava',
      quantity: 1,
      unit: 'ks',
      unit_price: 0,
      total_price: 0,
      sort_order: sortOrder++,
      source: 'mapping_rule',
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
    technology: technology !== 'none' ? technology : undefined,
  }
}
