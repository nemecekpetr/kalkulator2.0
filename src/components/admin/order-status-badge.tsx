'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { OrderStatus } from '@/lib/supabase/types'
import { ORDER_STATUS_LABELS } from '@/lib/supabase/types'
import { StatusSteps, ORDER_STATUSES } from './status-steps'

interface OrderStatusBadgeProps {
  orderId: string
  status: OrderStatus
}

export function OrderStatusBadge({ orderId, status }: OrderStatusBadgeProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      toast.success(`Stav objednávky změněn na "${ORDER_STATUS_LABELS[newStatus as OrderStatus]}"`)
      router.refresh()
    } catch (error) {
      toast.error('Nepodařilo se změnit stav objednávky')
      console.error('Error updating order status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      <StatusSteps
        statuses={ORDER_STATUSES}
        currentStatus={status}
        onStatusChange={updateStatus}
        disabled={isUpdating}
      />
    </div>
  )
}
