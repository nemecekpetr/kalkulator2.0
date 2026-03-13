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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { QuoteStatus, QuoteVariant } from '@/lib/supabase/types'
import { QUOTE_STATUS_LABELS } from '@/lib/supabase/types'
import { StatusSteps, QUOTE_STATUSES } from './status-steps'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

interface QuoteStatusBadgeProps {
  quoteId: string
  status: QuoteStatus
  validUntil?: string | null
  showCreateOrderButton?: boolean
  existingOrder?: { id: string; order_number: string } | null
  variants?: QuoteVariant[]
}

export function QuoteStatusBadge({
  quoteId,
  status,
  validUntil,
  showCreateOrderButton = true,
  existingOrder,
  variants = [],
}: QuoteStatusBadgeProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<string>(variants[0]?.id || '')

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: selectedVariant || undefined }),
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
              {variants.length > 0
                ? 'Vyberte variantu, ze které se vytvoří objednávka. Použijí se pouze položky a ceny vybrané varianty.'
                : 'Tato akce vytvoří novou objednávku z této nabídky.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {variants.length > 0 && (
            <RadioGroup value={selectedVariant} onValueChange={setSelectedVariant} className="gap-3 py-2">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value={v.id} id={`variant-${v.id}`} />
                  <Label htmlFor={`variant-${v.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{v.variant_name}</span>
                    <span className="ml-2 text-muted-foreground">{formatPrice(v.total_price)}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToOrder}
              disabled={variants.length > 0 && !selectedVariant}
            >
              Vytvořit objednávku
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
