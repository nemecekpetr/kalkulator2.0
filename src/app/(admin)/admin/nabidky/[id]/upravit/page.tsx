import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { QuoteEditor } from '@/components/admin/quote-editor'
import type { Product, Configuration, QuoteItem, QuoteVariant, QuoteVariantKey } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getQuoteWithDetails(id: string) {
  const supabase = await createAdminClient()

  // Fetch quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (quoteError || !quote) {
    return null
  }

  // Fetch quote items
  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  // Fetch quote variants
  const { data: variants } = await supabase
    .from('quote_variants')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  // Fetch item-variant associations
  const itemIds = (items || []).map((i) => i.id)
  let itemVariantAssociations: { quote_item_id: string; quote_variant_id: string }[] = []
  if (itemIds.length > 0) {
    const { data: associations } = await supabase
      .from('quote_item_variants')
      .select('quote_item_id, quote_variant_id')
      .in('quote_item_id', itemIds)
    itemVariantAssociations = associations || []
  }

  // Build variant ID to key map
  const variantIdToKey: Record<string, QuoteVariantKey> = {}
  ;(variants || []).forEach((v: QuoteVariant) => {
    variantIdToKey[v.id] = v.variant_key
  })

  // Add variant_keys to items
  const itemsWithVariantKeys = (items || []).map((item: QuoteItem) => {
    const variantIds = itemVariantAssociations
      .filter((a) => a.quote_item_id === item.id)
      .map((a) => a.quote_variant_id)
    const variantKeys = variantIds
      .map((vid) => variantIdToKey[vid])
      .filter(Boolean)
    return {
      ...item,
      variant_keys: variantKeys,
    }
  })

  // Fetch configuration if linked
  let configuration: Configuration | null = null
  if (quote.configuration_id) {
    const { data: configData } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', quote.configuration_id)
      .single()
    configuration = configData as Configuration | null
  }

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name')

  return {
    quote,
    items: itemsWithVariantKeys,
    variants: (variants || []) as QuoteVariant[],
    configuration,
    products: (products || []) as Product[],
  }
}

export default async function EditQuotePage({ params }: PageProps) {
  const { id } = await params
  const data = await getQuoteWithDetails(id)

  if (!data) {
    notFound()
  }

  const { quote, items, variants, configuration, products } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/nabidky/${quote.id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upravit nabídku {quote.quote_number}</h1>
          <p className="text-muted-foreground">
            Upravte položky a detaily nabídky
          </p>
        </div>
      </div>

      {/* Editor */}
      <QuoteEditor
        quoteNumber={quote.quote_number}
        products={products}
        configuration={configuration}
        existingQuote={{
          id: quote.id,
          customer_name: quote.customer_name,
          customer_email: quote.customer_email || '',
          customer_phone: quote.customer_phone || '',
          customer_address: quote.customer_address || '',
          notes: quote.notes || '',
          valid_until: quote.valid_until || '',
          items: items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name,
            description: item.description || '',
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            variant_keys: item.variant_keys || [],
          })),
          variants: variants.map((v) => ({
            id: v.id,
            variant_key: v.variant_key,
            variant_name: v.variant_name,
            discount_percent: v.discount_percent,
            discount_amount: v.discount_amount,
          })),
        }}
      />
    </div>
  )
}
