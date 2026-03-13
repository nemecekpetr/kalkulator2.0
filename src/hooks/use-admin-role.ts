'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

// Module-level cache to avoid repeated auth calls across components
let cachedRole: UserRole | null = null
let cachePromise: Promise<UserRole | null> | null = null

async function fetchRole(): Promise<UserRole | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }
    if (profile) {
      cachedRole = profile.role as UserRole
      return cachedRole
    }
  }
  return null
}

export function useAdminRole(): UserRole | null {
  // Initialize from cache synchronously to avoid unnecessary effect
  const [userRole, setUserRole] = useState<UserRole | null>(cachedRole)

  useEffect(() => {
    // Already have cached role — no need to fetch
    if (cachedRole) return

    // Deduplicate concurrent requests
    if (!cachePromise) {
      cachePromise = fetchRole().finally(() => {
        // Allow re-fetch after 60s
        setTimeout(() => { cachePromise = null }, 60_000)
      })
    }

    let cancelled = false
    cachePromise.then((role) => {
      if (!cancelled && role) setUserRole(role)
    })

    return () => { cancelled = true }
  }, [])

  return userRole
}
