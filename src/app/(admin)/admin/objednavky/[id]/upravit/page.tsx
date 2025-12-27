import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { OrderEditor } from '@/components/admin/order-editor'
import type { Order, OrderItem } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getOrder(id: string) {
  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return null
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('sort_order', { ascending: true })

  return {
    ...order,
    items: items || [],
  } as Order & { items: OrderItem[] }
}

export default async function EditOrderPage({ params }: PageProps) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/objednavky/${order.id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upravit objednávku {order.order_number}</h1>
          <p className="text-muted-foreground">
            Upravte detaily a položky objednávky
          </p>
        </div>
      </div>

      {/* Editor */}
      <OrderEditor order={order} />
    </div>
  )
}
