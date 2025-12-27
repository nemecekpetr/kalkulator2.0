'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Clock, Loader2, CheckCircle2, Settings } from 'lucide-react'
import type { ProductionStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: ProductionStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'pending',
    label: 'Čeká na výrobu',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-amber-600'
  },
  {
    value: 'in_progress',
    label: 'Ve výrobě',
    icon: <Settings className="w-4 h-4" />,
    color: 'text-blue-600'
  },
  {
    value: 'completed',
    label: 'Dokončeno',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-600'
  },
]

interface ProductionStatusSelectProps {
  productionId: string
  currentStatus: ProductionStatus
}

export function ProductionStatusSelect({ productionId, currentStatus }: ProductionStatusSelectProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ProductionStatus>(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleStatusChange(newStatus: ProductionStatus) {
    if (newStatus === status) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/production/${productionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Nepodařilo se změnit stav')
      }

      setStatus(newStatus)
      toast.success('Stav byl změněn')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba při změně stavu')
    } finally {
      setIsUpdating(false)
    }
  }

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === status)

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
      <SelectTrigger className={`w-[180px] ${currentOption?.color}`}>
        {isUpdating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Ukládám...</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className={`flex items-center gap-2 ${option.color}`}>
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
