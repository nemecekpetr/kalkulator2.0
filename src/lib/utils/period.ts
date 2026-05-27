import { subDays, startOfYear } from 'date-fns'

export type Period = '30d' | '90d' | 'ytd' | 'all'

const VALID_PERIODS: readonly Period[] = ['30d', '90d', 'ytd', 'all']

export const PERIOD_LABELS: Record<Period, string> = {
  '30d': 'Posledních 30 dní',
  '90d': 'Posledních 90 dní',
  ytd: 'Letos',
  all: 'Celá historie',
}

export const DEFAULT_PERIOD: Period = '30d'

/**
 * Bezpečně parsuje period query parameter.
 * Cokoli mimo VALID_PERIODS spadne na DEFAULT_PERIOD.
 */
export function parsePeriodParam(raw: string | undefined): Period {
  if (!raw) return DEFAULT_PERIOD
  return (VALID_PERIODS as readonly string[]).includes(raw)
    ? (raw as Period)
    : DEFAULT_PERIOD
}

/**
 * Vrátí ISO start date pro daný period, nebo null pro 'all' (žádný filter).
 */
export function periodStartIso(period: Period, now: Date = new Date()): string | null {
  switch (period) {
    case '30d':
      return subDays(now, 30).toISOString()
    case '90d':
      return subDays(now, 90).toISOString()
    case 'ytd':
      return startOfYear(now).toISOString()
    case 'all':
      return null
  }
}
