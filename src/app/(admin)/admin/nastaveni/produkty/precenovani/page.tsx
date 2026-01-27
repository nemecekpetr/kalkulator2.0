import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { PricingBulkEditor } from '@/components/admin/pricing-bulk-editor'
import type { Product } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Hromadné přeceňování | Rentmil Admin',
}

async function getProducts(): Promise<Product[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as Product[]
}

export default async function PricingPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/nastaveni/produkty">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zpět
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Hromadné přeceňování
          </h1>
          <p className="text-muted-foreground">
            Změna cen vybraných produktů procentuálně nebo o fixní částku
          </p>
        </div>
      </div>

      {/* Pricing Editor */}
      <PricingBulkEditor products={products} />
    </div>
  )
}
