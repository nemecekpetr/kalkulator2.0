// localStorage helper for tracking read changelog versions

const STORAGE_KEY = 'rentmil_last_seen_version'

// Get the last version the user has seen
export function getLastSeenVersion(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Set the last seen version
export function setLastSeenVersion(version: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, version)
  } catch {
    // localStorage not available
  }
}

// Compare two semver versions
// Returns: -1 if a < b, 0 if a === b, 1 if a > b
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0

    if (numA > numB) return 1
    if (numA < numB) return -1
  }

  return 0
}

// Check if there are unread versions
export function hasUnreadVersions(currentVersion: string): boolean {
  const lastSeen = getLastSeenVersion()
  if (!lastSeen) return true // Never seen any version
  return compareVersions(currentVersion, lastSeen) > 0
}

// Get count of unread versions from changelog
export function getUnreadVersionCount(
  versions: { version: string }[],
  currentVersion: string
): number {
  const lastSeen = getLastSeenVersion()
  if (!lastSeen) {
    // User hasn't seen any version, all versions up to current are "new"
    return versions.filter((v) => compareVersions(v.version, currentVersion) <= 0).length
  }

  // Count versions newer than last seen (up to current)
  return versions.filter(
    (v) =>
      compareVersions(v.version, lastSeen) > 0 &&
      compareVersions(v.version, currentVersion) <= 0
  ).length
}

// Mark current version as seen
export function markCurrentVersionAsSeen(currentVersion: string): void {
  setLastSeenVersion(currentVersion)
}
