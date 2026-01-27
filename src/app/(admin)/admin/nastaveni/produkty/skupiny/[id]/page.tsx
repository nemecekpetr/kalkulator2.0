import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductGroupEditor } from '@/components/admin/product-group-editor'
import type { Product, ProductGroupWithItems } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: group } = await supabase
    .from('product_groups')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: group ? `${group.name} | Rentmil Admin` : 'Skupina produktů | Rentmil Admin',
  }
}

async function getProductGroup(id: string): Promise<ProductGroupWithItems | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('product_groups')
    .select(`
      *,
      items:product_group_items(
        *,
        product:products(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching product group:', error)
    return null
  }

  return data as ProductGroupWithItems
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

export default async function EditProductGroupPage({ params }: PageProps) {
  const { id } = await params

  const [group, products] = await Promise.all([
    getProductGroup(id),
    getProducts(),
  ])

  if (!group) {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upravit skupinu produktů</h1>
      <ProductGroupEditor mode="edit" group={group} products={products} />
    </div>
  )
}
