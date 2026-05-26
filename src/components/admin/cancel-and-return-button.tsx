'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Undo2, Loader2 } from 'lucide-react'
import type { OrderStatus } from '@/lib/supabase/types'

interface CancelAndReturnButtonProps {
  orderId: string
  orderStatus: OrderStatus
}

export function CancelAndReturnButton({ orderId, orderStatus }: CancelAndReturnButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (orderStatus !== 'created' && orderStatus !== 'sent') return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel-and-return-to-quote`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Storno se nepodařilo')
        return
      }
      toast.success('Objednávka stornována. Můžete upravit nabídku.')
      router.push(`/admin/nabidky/${data.quoteId}/upravit`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Undo2 className="w-4 h-4 mr-2" />
          )}
          Vrátit k úpravě nabídky
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vrátit objednávku k úpravě nabídky?</AlertDialogTitle>
          <AlertDialogDescription>
            {'Tato objednávka se stornuje (zůstane v seznamu jako „Zrušeno"). Budete přesměrováni na editaci nabídky, ze které vznikla. Po úpravě nabídky můžete stávajícím tlačítkem „Vytvořit objednávku" vytvořit novou objednávku s vyšším pořadovým číslem.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Pokračovat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
