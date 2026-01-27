import { createAdminClient } from '@/lib/supabase/admin'
import { ProductForm } from '@/components/admin/product-form'
import type { Product } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nový produkt | Rentmil Admin',
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

export default async function NewProductPage() {
  const products = await getProducts()

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nový produkt</h1>
      <ProductForm mode="create" products={products} />
    </div>
  )
}
