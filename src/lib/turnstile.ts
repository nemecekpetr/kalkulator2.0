const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

export async function verifyTurnstile(token: string): Promise<boolean> {
  // Skip verification in development if no secret key is configured
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('Turnstile secret key not configured, skipping verification')
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
