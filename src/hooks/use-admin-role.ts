'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

export function useAdminRole(): UserRole | null {
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single() as { data: { role: string } | null }
        if (profile) {
          setUserRole(profile.role as UserRole)
        }
      }
    }
    fetchUserRole()
  }, [])

  return userRole
}
