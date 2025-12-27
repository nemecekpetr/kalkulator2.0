import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { ProductsTable } from '@/components/admin/products-table'
import { ProductsHeader } from '@/components/admin/products-header'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/lib/supabase/types'

async function getProducts(): Promise<Product[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as Product[]
}

async function getSyncStatus() {
  const supabase = await createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('pipedrive_synced_at')
    .order('pipedrive_synced_at', { ascending: false })
    .limit(1)

  return {
    lastSync: products?.[0]?.pipedrive_synced_at || null,
    pipedriveConfigured: !!process.env.PIPEDRIVE_API_TOKEN
  }
}

function ProductsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export default async function ProductsPage() {
  const [products, syncStatus] = await Promise.all([
    getProducts(),
    getSyncStatus()
  ])

  return (
    <div className="space-y-6">
      <ProductsHeader
        totalProducts={products.length}
        lastSync={syncStatus.lastSync}
        pipedriveConfigured={syncStatus.pipedriveConfigured}
      />

      <Suspense fallback={<ProductsTableSkeleton />}>
        <ProductsTable products={products} />
      </Suspense>
    </div>
  )
}
