// @ts-expect-error -- vocative-cz has types at dist/index.d.ts but its package.json exports field is missing the "types" condition
import { vocalize } from 'vocative-cz'

const MALE_EXCEPTIONS = [
  'nikita', 'saša', 'sascha', 'miša', 'ilja',
  'jirka', 'honza', 'pepa', 'vašek', 'franta', 'míra', 'slávek',
]

function isFemale(firstName: string): boolean {
  const lower = firstName.toLowerCase()
  if (MALE_EXCEPTIONS.includes(lower)) return false
  return lower.endsWith('a') || lower.endsWith('ie') || lower.endsWith('e')
}

/**
 * Generates formal Czech salutation with vocative case.
 * "Jan Novák" → "Vážený pane Nováku"
 * "Jana Nováková" → "Vážená paní Nováková"
 */
export function generateSalutation(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return `Vážený/á ${fullName}`

  const firstName = parts[0]
  const lastName = parts[parts.length - 1]
  const female = isFemale(firstName)

  if (female) {
    // Female surnames stay in nominative in vocative context
    return `Vážená paní ${lastName}`
  }

  // Male surname → vocative via vocative-cz
  const lastNameVocative = vocalize(lastName)
  return `Vážený pane ${lastNameVocative}`
}

/**
 * Detects if salutation refers to a female person.
 * Used for verb conjugation (projevil/projevila).
 */
export function isFemaleFromSalutation(salutation: string): boolean {
  return salutation.startsWith('Vážená')
}
