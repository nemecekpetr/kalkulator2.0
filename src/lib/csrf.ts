import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * CSRF Protection via Origin header validation
 *
 * Checks that requests come from the same origin as the app.
 * This is a defense-in-depth measure - admin routes are already
 * protected by authentication.
 */

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[]

/**
 * Validate that the request origin matches allowed origins
 * Returns error response if invalid, null if valid
 */
export async function validateCsrf(): Promise<NextResponse | null> {
  const headersList = await headers()

  const origin = headersList.get('origin')
  const referer = headersList.get('referer')

  // For same-origin requests, origin might not be set
  // In that case, check referer
  const requestOrigin = origin || (referer ? new URL(referer).origin : null)

  // If no origin info at all, allow (could be server-side or API client)
  // The auth check will still protect the route
  if (!requestOrigin) {
    return null
  }

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    if (!allowed) return false
    return requestOrigin === allowed || requestOrigin.startsWith(allowed)
  })

  if (!isAllowed) {
    console.warn(`CSRF: Blocked request from origin: ${requestOrigin}`)
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check if request method requires CSRF validation
 */
export function isMutatingMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}
