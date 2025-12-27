const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

export async function verifyTurnstile(token: string): Promise<boolean> {
  // Fail-closed: In production, require Turnstile to be configured
  if (!TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: TURNSTILE_SECRET_KEY not configured in production')
      throw new Error('Turnstile verification unavailable')
    }
    // Allow in development for testing
    console.warn('DEV: Turnstile secret key not configured, skipping verification')
    return true
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    )

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return false
  }
}
