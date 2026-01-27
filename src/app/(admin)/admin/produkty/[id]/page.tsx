import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductForm } from '@/components/admin/product-form'
import type { Product } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: product ? `${product.name} | Rentmil Admin` : 'Produkt | Rentmil Admin',
  }
}

async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching product:', error)
    return null
  }

  return data as Product
}

async function getAllProducts(): Promise<Product[]> {
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

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params

  const [product, allProducts] = await Promise.all([
    getProduct(id),
    getAllProducts(),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upravit produkt</h1>
      <ProductForm mode="edit" product={product} products={allProducts} />
    </div>
  )
}
