/**
 * Product Price Calculator
 * Calculates prices based on product price_type:
 * - fixed: Direct unit_price
 * - percentage: Percentage of a reference product's price
 * - surface_coefficient: Price per m² × pool surface
 */

import type { Product, PoolShape, PoolDimensions } from '@/lib/supabase/types'
import { calculatePoolSurface } from './pool-surface'

export interface PriceContext {
  /** Pool surface area in m² (for surface_coefficient calculations) */
  poolSurface?: number
  /** Pool shape and dimensions (alternative to poolSurface) */
  poolShape?: PoolShape
  poolDimensions?: PoolDimensions
  /** Map of product ID to its calculated/actual price (for percentage calculations) */
  productPrices: Map<string, number>
}

export interface CalculatedPrice {
  /** Final calculated price */
  price: number
  /** How the price was calculated */
  priceType: Product['price_type']
  /** For percentage: the reference product price used */
  referencePrice?: number
  /** For percentage: the actual percentage applied */
  percentageApplied?: number
  /** For surface_coefficient: the surface used */
  surfaceUsed?: number
  /** For surface_coefficient: the coefficient used */
  coefficientUsed?: number
  /** Products that should be automatically added (required surcharges) */
  requiredSurchargeIds: string[]
  /** Whether minimum price was applied (for percentage type) */
  minimumApplied?: boolean
}

/**
 * Calculate the price of a product based on its price_type
 *
 * @param product - The product to calculate price for
 * @param context - Context containing reference prices and pool dimensions
 * @returns Calculated price with metadata
 */
export function calculateProductPrice(
  product: Product,
  context: PriceContext
): CalculatedPrice {
  const result: CalculatedPrice = {
    price: 0,
    priceType: product.price_type || 'fixed',
    requiredSurchargeIds: product.required_surcharge_ids || [],
  }

  switch (product.price_type) {
    case 'fixed':
    default:
      result.price = product.unit_price
      break

    case 'percentage':
      if (product.price_reference_product_id && product.price_percentage) {
        const referencePrice = context.productPrices.get(
          product.price_reference_product_id
        )
        if (referencePrice !== undefined) {
          result.referencePrice = referencePrice
          result.percentageApplied = product.price_percentage

          let calculatedPrice = referencePrice * (product.price_percentage / 100)

          // Apply minimum if defined
          if (
            product.price_minimum !== null &&
            product.price_minimum !== undefined &&
            calculatedPrice < product.price_minimum
          ) {
            calculatedPrice = product.price_minimum
            result.minimumApplied = true
          }

          result.price = calculatedPrice
        } else {
          // Reference product price not found, fall back to unit_price
          result.price = product.unit_price
        }
      } else {
        // Missing configuration, fall back to unit_price
        result.price = product.unit_price
      }
      break

    case 'surface_coefficient':
      if (product.price_coefficient) {
        // Get pool surface from context
        let surface = context.poolSurface
        if (
          !surface &&
          context.poolShape &&
          context.poolDimensions
        ) {
          surface = calculatePoolSurface(
            context.poolShape,
            context.poolDimensions
          )
        }

        if (surface) {
          result.surfaceUsed = surface
          result.coefficientUsed = product.price_coefficient
          result.price = surface * product.price_coefficient
        } else {
          // No surface available, fall back to unit_price
          result.price = product.unit_price
        }
      } else {
        result.price = product.unit_price
      }
      break
  }

  return result
}

/**
 * Round price to whole number (standard Czech pricing)
 */
export function roundPrice(price: number): number {
  return Math.round(price)
}

/**
 * Format price for display in Czech format
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundPrice(price))
}

/**
 * Format price without currency symbol
 */
export function formatPriceNumber(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundPrice(price))
}

/**
 * Build a price context from a list of products
 * Sets up the productPrices map with fixed-price products
 */
export function buildPriceContext(
  products: Product[],
  poolShape?: PoolShape,
  poolDimensions?: PoolDimensions
): PriceContext {
  const productPrices = new Map<string, number>()

  // First pass: Add all fixed-price products
  for (const product of products) {
    if (product.price_type === 'fixed' || !product.price_type) {
      productPrices.set(product.id, product.unit_price)
    }
  }

  const context: PriceContext = {
    productPrices,
    poolShape,
    poolDimensions,
  }

  // Calculate pool surface if dimensions provided
  if (poolShape && poolDimensions) {
    context.poolSurface = calculatePoolSurface(poolShape, poolDimensions)
  }

  return context
}

/**
 * Calculate prices for all products, handling dependencies
 * Products with percentage pricing need their reference products calculated first
 */
export function calculateAllPrices(
  products: Product[],
  poolShape?: PoolShape,
  poolDimensions?: PoolDimensions
): Map<string, CalculatedPrice> {
  const context = buildPriceContext(products, poolShape, poolDimensions)
  const results = new Map<string, CalculatedPrice>()

  // Calculate surface coefficient products (they don't depend on other products)
  for (const product of products) {
    if (product.price_type === 'surface_coefficient') {
      const result = calculateProductPrice(product, context)
      results.set(product.id, result)
      context.productPrices.set(product.id, result.price)
    }
  }

  // Fixed products are already in context, calculate their results
  for (const product of products) {
    if (product.price_type === 'fixed' || !product.price_type) {
      const result = calculateProductPrice(product, context)
      results.set(product.id, result)
    }
  }

  // Calculate percentage products (may depend on other products)
  // Note: This simple implementation doesn't handle chains of percentage products
  for (const product of products) {
    if (product.price_type === 'percentage') {
      const result = calculateProductPrice(product, context)
      results.set(product.id, result)
      context.productPrices.set(product.id, result.price)
    }
  }

  return results
}

/**
 * Get a human-readable description of how the price was calculated
 */
export function getPriceDescription(calculated: CalculatedPrice): string {
  switch (calculated.priceType) {
    case 'fixed':
      return 'Fixní cena'

    case 'percentage':
      if (calculated.referencePrice !== undefined && calculated.percentageApplied) {
        let desc = `${calculated.percentageApplied}% z ${formatPrice(calculated.referencePrice)}`
        if (calculated.minimumApplied) {
          desc += ' (použito minimum)'
        }
        return desc
      }
      return 'Procentuální příplatek'

    case 'surface_coefficient':
      if (calculated.surfaceUsed && calculated.coefficientUsed) {
        return `${calculated.surfaceUsed.toFixed(1)} m² × ${formatPriceNumber(calculated.coefficientUsed)} Kč/m²`
      }
      return 'Koeficient × povrch'

    default:
      return 'Neznámý typ'
  }
}
