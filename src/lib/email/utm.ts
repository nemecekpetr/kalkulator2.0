const DIACRITIC_REGEX = /[̀-ͯ]/g

/**
 * Sanitizuje název kampaně do URL-friendly slugu.
 * "Zazimování 2026" → "zazimovani-2026"
 */
export function sanitizeCampaignSlug(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(DIACRITIC_REGEX, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'signature'
  )
}

/**
 * Přidá UTM parametry k URL pro tracking prokliků z emailových podpisů.
 * Zachovává existující query string a nikdy nepřepisuje již nastavené UTM parametry.
 */
export function appendUtm(url: string, campaign: string): string {
  try {
    const parsed = new URL(url)
    const slug = sanitizeCampaignSlug(campaign)

    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', 'email')
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', 'signature')
    }
    if (!parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', slug)
    }

    return parsed.toString()
  } catch {
    return url
  }
}
