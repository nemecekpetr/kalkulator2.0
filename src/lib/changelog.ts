// Changelog types and parser
// Parses CHANGELOG.md and returns structured data

export type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking'

export interface Change {
  type: ChangeType
  scope?: string
  description: string
  /** User-friendly description in plain Czech for non-technical users */
  userDescription?: string
}

export interface ChangelogVersion {
  version: string
  date: string
  changes: Change[]
}

// Map section headers to change types
const SECTION_TYPE_MAP: Record<string, ChangeType> = {
  'novinky': 'feature',
  'features': 'feature',
  'opravy': 'fix',
  'fixes': 'fix',
  'bug fixes': 'fix',
  'vylepšení': 'improvement',
  'improvements': 'improvement',
  'performance improvements': 'improvement',
  'breaking changes': 'breaking',
  'breaking': 'breaking',
}

// Parse a single change line: "- **scope:** description" or "- description"
function parseChangeLine(line: string): { scope?: string; description: string } | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('-')) return null

  const content = trimmed.slice(1).trim()

  // Check for scope format: **scope:** description
  const scopeMatch = content.match(/^\*\*([^*]+)\*\*:\s*(.+)$/)
  if (scopeMatch) {
    return {
      scope: scopeMatch[1].trim(),
      description: scopeMatch[2].trim(),
    }
  }

  // No scope, just description
  if (content) {
    return { description: content }
  }

  return null
}

// Parse CHANGELOG.md content into structured data
export function parseChangelog(content: string): ChangelogVersion[] {
  const versions: ChangelogVersion[] = []
  const lines = content.split('\n')

  let currentVersion: ChangelogVersion | null = null
  let currentType: ChangeType | null = null

  for (const line of lines) {
    // Version header: ## [1.2.0] - 2025-01-02
    const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s*-?\s*(.*)$/)
    if (versionMatch) {
      if (currentVersion) {
        versions.push(currentVersion)
      }
      currentVersion = {
        version: versionMatch[1].trim(),
        date: versionMatch[2].trim() || '',
        changes: [],
      }
      currentType = null
      continue
    }

    // Section header: ### Novinky
    const sectionMatch = line.match(/^###\s+(.+)$/)
    if (sectionMatch && currentVersion) {
      const sectionName = sectionMatch[1].trim().toLowerCase()
      currentType = SECTION_TYPE_MAP[sectionName] || null
      continue
    }

    // Change line
    if (currentVersion && currentType) {
      const change = parseChangeLine(line)
      if (change) {
        currentVersion.changes.push({
          type: currentType,
          scope: change.scope,
          description: change.description,
        })
      }
    }
  }

  // Don't forget last version
  if (currentVersion) {
    versions.push(currentVersion)
  }

  return versions
}

// Get current app version from package.json (embedded at build time)
export function getCurrentVersion(): string {
  // This will be replaced during build or we read from a generated file
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
}

// Get type label in Czech
export function getTypeLabel(type: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    feature: 'Novinka',
    fix: 'Oprava',
    improvement: 'Vylepšení',
    breaking: 'Důležitá změna',
  }
  return labels[type]
}

// Get type color for badges
export function getTypeColor(type: ChangeType): string {
  const colors: Record<ChangeType, string> = {
    feature: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    fix: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    improvement: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    breaking: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  }
  return colors[type]
}
