import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { MappingRulesTable } from '@/components/admin/mapping-rules-table'
import { PoolMappingSection } from '@/components/admin/pool-mapping-section'
import { SetMappingSection } from '@/components/admin/set-mapping-section'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'
import type { ProductMappingRule, Product } from '@/lib/supabase/types'

async function getMappingRules(): Promise<ProductMappingRule[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('product_mapping_rules')
    .select('*, product:products(*)')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching mapping rules:', error)
    return []
  }

  return data as ProductMappingRule[]
}

async function getProducts(): Promise<Product[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data as Product[]
}

function TableSkeleton() {
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

export default async function MappingRulesPage() {
  const [rules, products] = await Promise.all([
    getMappingRules(),
    getProducts()
  ])

  const rulesWithProducts = rules.filter(r => r.product_id).length
  const rulesWithoutProducts = rules.filter(r => !r.product_id).length

  return (
    <div className="space-y-6">
      {/* Header with info */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/nastaveni/produkty">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Mapovani produktu</h1>
            <p className="text-muted-foreground">
              Propojeni voleb konfiguratoru s produkty
            </p>
          </div>
        </div>

        {/* Info box - inline on larger screens */}
        <div className="lg:max-w-md p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-muted-foreground">
              <p>
                Pravidla mapuji volby konfiguratoru na produkty v nabidce.
                <strong className="ml-1">Stav:</strong> {rulesWithProducts} prirazenych, {rulesWithoutProducts} ceka.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Set Mapping Section */}
      <Card className="bg-amber-50/50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-700">Mapovani setu</span>
          </CardTitle>
          <CardDescription>
            Sety se automaticky prirazuji dle rozmeru bazenu a nahrazuji skelet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <SetMappingSection setProducts={products.filter(p => p.category === 'sety')} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Mapping Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pravidla mapovani prislusenstvi</CardTitle>
          <CardDescription>
            Kliknutim na radek muzete priradit produkt k pravidlu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <MappingRulesTable rules={rules} products={products} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Pool Mapping Section */}
      <Card className="bg-cyan-50/50 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-cyan-700">Mapovani bazenu</span>
          </CardTitle>
          <CardDescription>
            Bazeny se automaticky prirazuji podle kodu produktu (napr. BAZ-OBD-SK-3-6-1.2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <PoolMappingSection poolProducts={products.filter(p => p.category === 'skelety')} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
