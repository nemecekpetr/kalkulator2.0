import { readFile } from 'fs/promises'
import path from 'path'

// Cache TTL: 1 hour (in milliseconds)
const CACHE_TTL_MS = 60 * 60 * 1000

interface CacheEntry {
  value: string
  timestamp: number
}

let cache: CacheEntry | null = null

/**
 * Get logo as base64 data URI with TTL-based caching
 * Cache auto-refreshes after 1 hour
 */
export async function getLogoDataUri(): Promise<string> {
  const now = Date.now()

  // Return cached value if still valid
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.value
  }

  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.svg')
    const svgContent = await readFile(logoPath, 'utf-8')
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`

    // Update cache
    cache = {
      value: dataUri,
      timestamp: now,
    }

    return dataUri
  } catch (error) {
    console.error('[LogoCache] Failed to load logo:', error)
    return ''
  }
}

/**
 * Force invalidate the logo cache
 * Useful for testing or manual refresh
 */
export function invalidateLogoCache(): void {
  cache = null
}
