/**
 * Product Prerequisites Checker
 * Validates that required products are present before adding a product to a quote
 */

import type { Product, PoolShape, QuoteItem } from '@/lib/supabase/types'

export interface PrerequisiteCheckResult {
  /** Whether the product can be added */
  canAdd: boolean
  /** Products that are missing (required but not in quote) */
  missingPrerequisites: Product[]
  /** Human-readable message about missing prerequisites */
  message?: string
  /** Whether prerequisites were skipped due to pool shape */
  skippedDueToShape?: boolean
}

/**
 * Check if a product's prerequisites are satisfied
 *
 * Logic:
 * 1. If product has no prerequisites → OK
 * 2. If current pool shape is in prerequisite_pool_shapes → prerequisites are NOT checked
 * 3. Otherwise, all prerequisite products must be in the current quote items
 *
 * Example: 8mm material
 * - prerequisite_pool_shapes: ['circle'] → for circle pools, no prerequisites needed
 * - prerequisite_product_ids: [sharp_corners_id] → for rectangle, requires sharp corners
 *
 * @param product - Product being added
 * @param currentItems - Current quote items
 * @param poolShape - Current pool shape (optional)
 * @param allProducts - All products for looking up missing prerequisites
 * @returns Check result with canAdd flag and missing prerequisites
 */
export function checkProductPrerequisites(
  product: Product,
  currentItems: QuoteItem[],
  poolShape: PoolShape | null | undefined,
  allProducts: Product[]
): PrerequisiteCheckResult {
  // 1. If product has no prerequisites → OK
  if (!product.prerequisite_product_ids?.length) {
    return { canAdd: true, missingPrerequisites: [] }
  }

  // 2. If current pool shape is in prerequisite_pool_shapes → skip check
  if (
    poolShape &&
    product.prerequisite_pool_shapes?.includes(poolShape)
  ) {
    return {
      canAdd: true,
      missingPrerequisites: [],
      skippedDueToShape: true,
    }
  }

  // 3. Check if all prerequisite products are in quote
  const currentProductIds = new Set(
    currentItems
      .map((item) => item.product_id)
      .filter((id): id is string => id !== null)
  )

  const missingIds = product.prerequisite_product_ids.filter(
    (id) => !currentProductIds.has(id)
  )

  if (missingIds.length === 0) {
    return { canAdd: true, missingPrerequisites: [] }
  }

  // 4. Find missing products
  const missingPrerequisites = allProducts.filter((p) =>
    missingIds.includes(p.id)
  )

  // 5. Build message
  const missingNames = missingPrerequisites.map((p) => p.name).join(', ')
  const message = missingPrerequisites.length > 0
    ? `Pro přidání "${product.name}" je nutné nejprve přidat: ${missingNames}`
    : `Pro přidání "${product.name}" chybí požadované produkty`

  return {
    canAdd: false,
    missingPrerequisites,
    message,
  }
}

/**
 * Get all prerequisite products for a given product
 * Useful for displaying what will be added together
 *
 * @param product - Product to get prerequisites for
 * @param allProducts - All available products
 * @returns Array of prerequisite products
 */
export function getPrerequisiteProducts(
  product: Product,
  allProducts: Product[]
): Product[] {
  if (!product.prerequisite_product_ids?.length) {
    return []
  }

  return allProducts.filter((p) =>
    product.prerequisite_product_ids?.includes(p.id)
  )
}

/**
 * Check if prerequisites check should be skipped for a given pool shape
 *
 * @param product - Product to check
 * @param poolShape - Current pool shape
 * @returns True if prerequisites should be skipped
 */
export function shouldSkipPrerequisites(
  product: Product,
  poolShape: PoolShape | null | undefined
): boolean {
  if (!poolShape) {
    return false
  }

  return product.prerequisite_pool_shapes?.includes(poolShape) ?? false
}
