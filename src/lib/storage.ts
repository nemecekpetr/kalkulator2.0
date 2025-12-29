/**
 * Custom storage implementation with Safari ITP fallback
 *
 * Safari's Intelligent Tracking Prevention (ITP) blocks localStorage
 * in cross-origin iframes. This provides a memory fallback when
 * localStorage is unavailable.
 */

import type { PersistStorage, StorageValue } from 'zustand/middleware'

// In-memory fallback storage for Safari ITP
const memoryStorage = new Map<string, string>()

/**
 * Check if localStorage is available and functional
 * Safari ITP may block localStorage in cross-origin iframes
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    const retrieved = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    return retrieved === testKey
  } catch {
    return false
  }
}

/**
 * Custom storage for Zustand that falls back to memory storage
 * when localStorage is blocked (Safari ITP in iframes)
 */
export const createSafeStorage = <T>(): PersistStorage<T> => {
  // Check storage availability once on creation
  let storageAvailable: boolean | null = null

  const checkStorage = () => {
    if (storageAvailable === null) {
      storageAvailable = isStorageAvailable()
      if (!storageAvailable) {
        console.warn(
          '[Rentmil Configurator] localStorage unavailable (Safari ITP?). ' +
          'Using memory storage - data will not persist across page reloads.'
        )
      }
    }
    return storageAvailable
  }

  return {
    getItem: (name: string): StorageValue<T> | null => {
      let raw: string | null = null

      if (checkStorage()) {
        raw = localStorage.getItem(name)
      } else {
        raw = memoryStorage.get(name) ?? null
      }

      if (!raw) return null

      try {
        return JSON.parse(raw) as StorageValue<T>
      } catch {
        return null
      }
    },

    setItem: (name: string, value: StorageValue<T>): void => {
      const serialized = JSON.stringify(value)

      if (checkStorage()) {
        try {
          localStorage.setItem(name, serialized)
        } catch (e) {
          // Quota exceeded or other error - fallback to memory
          console.warn('[Rentmil Configurator] localStorage write failed, using memory:', e)
          memoryStorage.set(name, serialized)
        }
      } else {
        memoryStorage.set(name, serialized)
      }
    },

    removeItem: (name: string): void => {
      if (checkStorage()) {
        localStorage.removeItem(name)
      }
      memoryStorage.delete(name)
    },
  }
}
