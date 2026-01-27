import { createAdminClient } from '@/lib/supabase/admin'
import { ProductGroupEditor } from '@/components/admin/product-group-editor'
import type { Product } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nová skupina produktů | Rentmil Admin',
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

export default async function NewProductGroupPage() {
  const products = await getProducts()

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nová skupina produktů</h1>
      <ProductGroupEditor mode="create" products={products} />
    </div>
  )
}
