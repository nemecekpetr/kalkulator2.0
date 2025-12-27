'use client'

import type { ConfigurationStatus } from '@/lib/supabase/types'
import { StatusSteps, CONFIGURATION_STATUSES } from './status-steps'

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatus
}

export function ConfigurationStatusBadge({ status }: ConfigurationStatusBadgeProps) {
  // Configuration status is read-only (auto-managed when quote is created)
  return (
    <StatusSteps
      statuses={CONFIGURATION_STATUSES}
      currentStatus={status}
      disabled={true}
    />
  )
}
