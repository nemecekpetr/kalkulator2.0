/**
 * Parse skeleton product code to extract pool shape, type and dimensions
 *
 * Code format: BAZ-{SHAPE}-{TYPE}-{DIMENSIONS}
 * Examples:
 *   BAZ-OBD-SK-3-6-1.2 → rectangle, skimmer, 3×6×1.2m
 *   BAZ-KRU-SK-4-1.5 → circle, skimmer, 4m diameter, 1.5m depth
 *   BAZ-OBD-PR-4-8-1.5 → rectangle, overflow, 4×8×1.5m
 */

import type { PoolShape, PoolType, PoolDimensions } from '@/lib/supabase/types'

export interface ParsedSkeletonCode {
  shape: PoolShape
  type: PoolType
  dimensions: PoolDimensions
}

// Shape codes mapping
const SHAPE_CODES: Record<string, PoolShape> = {
  'OBD': 'rectangle_rounded',
  'OBD-O': 'rectangle_sharp',
  'KRU': 'circle',
}

// Type codes mapping
const TYPE_CODES: Record<string, PoolType> = {
  'SK': 'skimmer',
  'PR': 'overflow',
}

/**
 * Parse a skeleton product code to extract pool parameters
 *
 * @param code - Product code (e.g., "BAZ-OBD-SK-3-6-1.2")
 * @returns Parsed skeleton code or null if invalid
 */
export function parseSkeletonCode(code: string | null): ParsedSkeletonCode | null {
  if (!code) {
    return null
  }

  // Normalize: uppercase and trim
  const normalized = code.toUpperCase().trim()

  // Must start with BAZ-
  if (!normalized.startsWith('BAZ-')) {
    return null
  }

  // Remove BAZ- prefix
  const rest = normalized.slice(4)

  // Split by hyphen
  const parts = rest.split('-')

  if (parts.length < 4) {
    return null
  }

  // Try to parse shape (could be "OBD" or "OBD-O")
  let shape: PoolShape | null = null
  let typeStartIndex = 1

  // Check for compound shape code (e.g., OBD-O for sharp corners)
  if (parts.length >= 5 && parts[0] === 'OBD' && parts[1] === 'O') {
    shape = 'rectangle_sharp'
    typeStartIndex = 2
  } else {
    shape = SHAPE_CODES[parts[0]] ?? null
  }

  if (!shape) {
    return null
  }

  // Parse type
  const typeCode = parts[typeStartIndex]
  const type = TYPE_CODES[typeCode] ?? null

  if (!type) {
    return null
  }

  // Parse dimensions
  const dimensionParts = parts.slice(typeStartIndex + 1)

  let dimensions: PoolDimensions | null = null

  if (shape === 'circle') {
    // Circle: diameter-depth (e.g., 4-15 where 15 = 1.5m)
    if (dimensionParts.length >= 2) {
      let diameter = parseFloat(dimensionParts[0])
      let depth = parseFloat(dimensionParts[1])

      // Convert from decimeters to meters if values are too large
      // Max reasonable pool diameter is ~12m, depth is ~3m
      if (diameter > 12) {
        diameter = diameter / 10
      }
      if (depth > 3) {
        depth = depth / 10
      }

      if (!isNaN(diameter) && !isNaN(depth) && diameter > 0 && depth > 0) {
        dimensions = { diameter, depth }
      }
    }
  } else {
    // Rectangle: width-length-depth (e.g., 6-35-15 where 35 = 3.5m, 15 = 1.5m)
    if (dimensionParts.length >= 3) {
      let width = parseFloat(dimensionParts[0])
      let length = parseFloat(dimensionParts[1])
      let depth = parseFloat(dimensionParts[2])

      // Convert from decimeters to meters if values are too large
      // Max reasonable pool width/length is ~12m, depth is ~3m
      if (width > 12) {
        width = width / 10
      }
      if (length > 12) {
        length = length / 10
      }
      if (depth > 3) {
        depth = depth / 10
      }

      if (!isNaN(width) && !isNaN(length) && !isNaN(depth) &&
          width > 0 && length > 0 && depth > 0) {
        dimensions = { width, length, depth }
      }
    }
  }

  if (!dimensions) {
    return null
  }

  return { shape, type, dimensions }
}

/**
 * Check if a product code is a skeleton code
 *
 * @param code - Product code
 * @returns True if code represents a skeleton
 */
export function isSkeletonCode(code: string | null): boolean {
  return parseSkeletonCode(code) !== null
}

/**
 * Format dimensions from parsed skeleton code for display
 *
 * @param parsed - Parsed skeleton code
 * @returns Formatted dimensions string (e.g., "3×6×1.2m" or "4m")
 */
export function formatSkeletonDimensions(parsed: ParsedSkeletonCode): string {
  const { shape, dimensions } = parsed

  if (shape === 'circle') {
    return `${dimensions.diameter}×${dimensions.depth}m`
  }

  return `${dimensions.width}×${dimensions.length}×${dimensions.depth}m`
}
