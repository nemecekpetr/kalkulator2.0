'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductionStatus } from '@/lib/supabase/types'
import { PRODUCTION_STATUS_LABELS } from '@/lib/supabase/types'
import { StatusSteps, PRODUCTION_STATUSES } from './status-steps'

interface ProductionStatusBadgeProps {
  productionOrderId: string
  currentStatus: ProductionStatus
}

export function ProductionStatusBadge({ productionOrderId, currentStatus }: ProductionStatusBadgeProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/production/${productionOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success(`Stav změněn na "${PRODUCTION_STATUS_LABELS[newStatus as ProductionStatus]}"`)
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Nepodařilo se změnit stav')
      }
    } catch {
      toast.error('Nepodařilo se změnit stav')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      <StatusSteps
        statuses={PRODUCTION_STATUSES}
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
        disabled={isUpdating}
      />
    </div>
  )
}
