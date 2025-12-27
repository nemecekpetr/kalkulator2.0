import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create rate limiters only if Redis is configured
let formRatelimit: Ratelimit | null = null
let adminReadRatelimit: Ratelimit | null = null
let adminWriteRatelimit: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // Allow 5 requests per hour per IP for form submissions
  formRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'rentmil-form',
  })

  // Admin API: 100 read requests per minute per user
  adminReadRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'rentmil-admin-read',
  })

  // Admin API: 30 write requests per minute per user
  adminWriteRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'rentmil-admin-write',
  })
}

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

async function doRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  name: string
): Promise<RateLimitResult> {
  // Fail-closed in production: If Redis not configured, deny requests
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`CRITICAL: ${name} rate limiting not configured in production`)
      return { success: false, remaining: 0, reset: Date.now() + 60000 }
    }
    // Allow in development for testing
    return { success: true, remaining: 999, reset: 0 }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error(`${name} rate limit check error:`, error)
    // Fail-closed in production: If check fails, deny request
    if (process.env.NODE_ENV === 'production') {
      return { success: false, remaining: 0, reset: Date.now() + 60000 }
    }
    return { success: true, remaining: 999, reset: 0 }
  }
}

/**
 * Check rate limit for public form submissions (5/hour per IP)
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  return doRateLimit(formRatelimit, identifier, 'Form')
}

/**
 * Check rate limit for admin read operations (100/min per user)
 */
export async function checkAdminReadLimit(userId: string): Promise<RateLimitResult> {
  return doRateLimit(adminReadRatelimit, userId, 'Admin read')
}

/**
 * Check rate limit for admin write operations (30/min per user)
 */
export async function checkAdminWriteLimit(userId: string): Promise<RateLimitResult> {
  return doRateLimit(adminWriteRatelimit, userId, 'Admin write')
}
