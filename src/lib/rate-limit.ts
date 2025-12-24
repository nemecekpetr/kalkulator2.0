import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create rate limiter only if Redis is configured
let ratelimit: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // Allow 5 requests per hour per IP for form submissions
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'rentmil-configurator',
  })
}

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean
  remaining: number
  reset: number
}> {
  // Skip rate limiting in development if not configured
  if (!ratelimit) {
    console.warn('Rate limiting not configured, skipping check')
    return { success: true, remaining: 999, reset: 0 }
  }

  try {
    const result = await ratelimit.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Allow request if rate limit check fails
    return { success: true, remaining: 999, reset: 0 }
  }
}
