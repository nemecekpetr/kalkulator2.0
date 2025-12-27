import { createAdminClient } from '@/lib/supabase/admin'
import { OrdersTable } from '@/components/admin/orders-table'
import { OrdersFilters } from '@/components/admin/orders-filters'
import type { Order, OrderStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}

async function getOrders(filters: { status?: string; search?: string }) {
  const supabase = await createAdminClient()

  let query = supabase
    .from('orders')
    .select('*, quotes(quote_number)')
    .order('created_at', { ascending: false })

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as OrderStatus)
  }

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`
    )
  }

  const { data: orders, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return orders as (Order & { quotes?: { quote_number: string } | null })[]
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const orders = await getOrders(params)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Objednávky</h1>
        <p className="text-muted-foreground">
          Celkem {orders.length} objednávek
        </p>
      </div>

      {/* Filters */}
      <OrdersFilters />

      {/* Orders table */}
      <OrdersTable orders={orders} />
    </div>
  )
}
