/**
 * Pool Surface Calculator
 * Calculates the surface area of a pool (walls + bottom) for pricing calculations
 */

import type { PoolDimensions, PoolShape } from '@/lib/supabase/types'

/**
 * Calculate the total surface area of a pool (walls + bottom)
 *
 * For rectangular pools:
 * - Walls: 2×(width×depth) + 2×(length×depth)
 * - Bottom: width × length
 *
 * For circular pools:
 * - Walls: π × diameter × depth
 * - Bottom: π × (diameter/2)²
 *
 * @param shape - Pool shape (circle, rectangle_rounded, rectangle_sharp)
 * @param dimensions - Pool dimensions in meters
 * @returns Total surface area in m²
 */
export function calculatePoolSurface(
  shape: PoolShape,
  dimensions: PoolDimensions
): number {
  if (shape === 'circle') {
    if (!dimensions.diameter) {
      return 0
    }
    const radius = dimensions.diameter / 2
    // Wall surface: circumference × depth
    const wallSurface = Math.PI * dimensions.diameter * dimensions.depth
    // Bottom surface: circle area
    const bottomSurface = Math.PI * radius * radius
    return wallSurface + bottomSurface
  }

  // Rectangular pools (both rounded and sharp corners)
  if (!dimensions.width || !dimensions.length) {
    return 0
  }

  // Wall surfaces: 2 short walls + 2 long walls
  const wallSurface =
    2 * (dimensions.width * dimensions.depth) +
    2 * (dimensions.length * dimensions.depth)
  // Bottom surface
  const bottomSurface = dimensions.width * dimensions.length

  return wallSurface + bottomSurface
}

/**
 * Format pool surface for display
 * @param surface - Surface area in m²
 * @returns Formatted string (e.g., "39.6 m²")
 */
export function formatPoolSurface(surface: number): string {
  return `${surface.toFixed(1)} m²`
}

/**
 * Calculate the perimeter of a pool skeleton (běžný metr)
 *
 * For rectangular pools:
 * - Perimeter: 2 × (width + length)
 *
 * For circular pools:
 * - Perimeter: π × diameter
 *
 * @param shape - Pool shape (circle, rectangle_rounded, rectangle_sharp)
 * @param dimensions - Pool dimensions in meters
 * @returns Perimeter in meters (bm)
 */
export function calculatePoolPerimeter(
  shape: PoolShape,
  dimensions: PoolDimensions
): number {
  if (shape === 'circle') {
    if (!dimensions.diameter) {
      return 0
    }
    // Circumference: π × diameter
    return Math.PI * dimensions.diameter
  }

  // Rectangular pools (both rounded and sharp corners)
  if (!dimensions.width || !dimensions.length) {
    return 0
  }

  // Perimeter: 2 × (width + length)
  return 2 * (dimensions.width + dimensions.length)
}

/**
 * Format pool perimeter for display
 * @param perimeter - Perimeter in meters
 * @returns Formatted string (e.g., "18.0 bm")
 */
export function formatPoolPerimeter(perimeter: number): string {
  return `${perimeter.toFixed(1)} bm`
}

/**
 * Calculate pool volume in cubic meters
 * Useful for water treatment calculations
 *
 * @param shape - Pool shape
 * @param dimensions - Pool dimensions in meters
 * @returns Volume in m³
 */
export function calculatePoolVolume(
  shape: PoolShape,
  dimensions: PoolDimensions
): number {
  if (shape === 'circle') {
    if (!dimensions.diameter) {
      return 0
    }
    const radius = dimensions.diameter / 2
    return Math.PI * radius * radius * dimensions.depth
  }

  // Rectangular pools
  if (!dimensions.width || !dimensions.length) {
    return 0
  }

  return dimensions.width * dimensions.length * dimensions.depth
}

/**
 * Format pool volume for display
 * @param volume - Volume in m³
 * @returns Formatted string (e.g., "21.6 m³")
 */
export function formatPoolVolume(volume: number): string {
  return `${volume.toFixed(1)} m³`
}

/**
 * Parse dimension string to PoolDimensions
 * Handles formats like "3-6-1.2" or "3x6x1.2"
 */
export function parseDimensionString(
  dimensionStr: string,
  shape: PoolShape
): PoolDimensions | null {
  // Replace common separators with hyphen
  const normalized = dimensionStr.replace(/[x×X]/g, '-')
  const parts = normalized.split('-').map((p) => parseFloat(p.trim()))

  if (shape === 'circle') {
    if (parts.length < 2 || parts.some(isNaN)) {
      return null
    }
    return {
      diameter: parts[0],
      depth: parts[1],
    }
  }

  // Rectangular
  if (parts.length < 3 || parts.some(isNaN)) {
    return null
  }

  return {
    width: parts[0],
    length: parts[1],
    depth: parts[2],
  }
}
