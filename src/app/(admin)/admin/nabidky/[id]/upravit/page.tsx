import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { QuoteEditor } from '@/components/admin/quote-editor'
import type { Product, Configuration, QuoteItem } from '@/lib/supabase/types'

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
    items: (items || []) as QuoteItem[],
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

  const { quote, items, configuration, products } = data

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
          })),
        }}
      />
    </div>
  )
}
