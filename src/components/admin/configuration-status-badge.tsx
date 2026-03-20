'use client'

import type { ConfigurationStatus } from '@/lib/supabase/types'
import { StatusChip, CONFIGURATION_STATUSES, getStatusStep } from './status-steps'

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatus
}

export function ConfigurationStatusBadge({ status }: ConfigurationStatusBadgeProps) {
  const step = getStatusStep(CONFIGURATION_STATUSES, status)
  if (!step) return null
  return <StatusChip status={step} />
}
