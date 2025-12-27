'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wrench, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface CreateProductionButtonProps {
  orderId: string
  existingProductionId?: string | null
  existingProductionNumber?: string | null
}

export function CreateProductionButton({
  orderId,
  existingProductionId,
  existingProductionNumber,
}: CreateProductionButtonProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  // If production order already exists, show link to it
  if (existingProductionId && existingProductionNumber) {
    return (
      <Button variant="outline" asChild>
        <Link href={`/admin/vyroba/${existingProductionId}`}>
          <Wrench className="w-4 h-4 mr-2" />
          {existingProductionNumber}
          <ExternalLink className="w-3 h-3 ml-2" />
        </Link>
      </Button>
    )
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })

      if (response.ok) {
        const production = await response.json()
        toast.success(`Výrobní zadání ${production.production_number} vytvořeno`)
        router.push(`/admin/vyroba/${production.id}`)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Nepodařilo se vytvořit výrobní zadání')
      }
    } catch {
      toast.error('Nepodařilo se vytvořit výrobní zadání')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={isCreating}>
      {isCreating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Wrench className="w-4 h-4 mr-2" />
      )}
      Vytvořit výrobák
    </Button>
  )
}
