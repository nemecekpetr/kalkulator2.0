'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { QuoteStatus } from '@/lib/supabase/types'
import { QUOTE_STATUS_LABELS } from '@/lib/supabase/types'
import { StatusSteps, QUOTE_STATUSES } from './status-steps'

interface QuoteStatusBadgeProps {
  quoteId: string
  status: QuoteStatus
  validUntil?: string | null
  showCreateOrderButton?: boolean
  existingOrder?: { id: string; order_number: string } | null
}

export function QuoteStatusBadge({
  quoteId,
  status,
  validUntil,
  showCreateOrderButton = true,
  existingOrder,
}: QuoteStatusBadgeProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  // Check if quote is expired (valid_until has passed and status is 'sent')
  const isExpired = !!(validUntil && new Date(validUntil) < new Date() && status === 'sent')

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      toast.success(`Stav nabídky změněn na "${QUOTE_STATUS_LABELS[newStatus as QuoteStatus]}"`)
      router.refresh()
    } catch (error) {
      toast.error('Nepodařilo se změnit stav nabídky')
      console.error('Error updating quote status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConvertToOrder = async () => {
    setShowConvertDialog(false)
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/convert`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      const { orderId } = await response.json()
      toast.success('Nabídka byla převedena na objednávku')
      router.push(`/admin/objednavky/${orderId}`)
    } catch (error) {
      toast.error('Nepodařilo se převést nabídku na objednávku')
      console.error('Error converting quote to order:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <StatusSteps
          statuses={QUOTE_STATUSES}
          currentStatus={status}
          onStatusChange={updateStatus}
          disabled={isUpdating}
          showExpiredWarning={isExpired}
        />
        {/* Show existing order link or create button when status is accepted */}
        {status === 'accepted' && showCreateOrderButton && (
          existingOrder ? (
            <Link
              href={`/admin/objednavky/${existingOrder.id}`}
              className="px-3 py-1.5 text-sm font-medium rounded-full border-2 border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100 transition-all duration-200 inline-flex items-center gap-1.5"
            >
              {existingOrder.order_number}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => setShowConvertDialog(true)}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm font-medium rounded-full border-2 border-purple-300 bg-white text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
            >
              Vytvořit objednávku
            </button>
          )
        )}
      </div>

      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vytvořit objednávku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce vytvoří novou objednávku z této nabídky.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToOrder}>
              Vytvořit objednávku
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
