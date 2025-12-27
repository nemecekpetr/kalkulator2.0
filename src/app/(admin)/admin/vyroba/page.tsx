import { createAdminClient } from '@/lib/supabase/admin'
import { ProductionTable } from '@/components/admin/production-table'
import { ProductionFilters } from '@/components/admin/production-filters'
import type { ProductionOrder, ProductionStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}

async function getProductionOrders(filters: { status?: string; search?: string }) {
  const supabase = await createAdminClient()

  let query = supabase
    .from('production_orders')
    .select('*, orders(order_number, customer_name)')
    .order('created_at', { ascending: false })

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as ProductionStatus)
  }

  // Apply search filter - search in production_number and related order info
  if (filters.search) {
    query = query.or(
      `production_number.ilike.%${filters.search}%`
    )
  }

  const { data: productionOrders, error } = await query

  if (error) {
    console.error('Error fetching production orders:', error)
    return []
  }

  return productionOrders as (ProductionOrder & { orders?: { order_number: string; customer_name: string } | null })[]
}

export default async function ProductionPage({ searchParams }: PageProps) {
  const params = await searchParams
  const productionOrders = await getProductionOrders(params)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Výroba</h1>
        <p className="text-muted-foreground">
          Celkem {productionOrders.length} výrobních zadání
        </p>
      </div>

      {/* Filters */}
      <ProductionFilters />

      {/* Production orders table */}
      <ProductionTable productionOrders={productionOrders} />
    </div>
  )
}
