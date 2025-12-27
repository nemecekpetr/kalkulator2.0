import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

import { QuoteEditor } from '@/components/admin/quote-editor'
import type { Product, Configuration } from '@/lib/supabase/types'

interface PageProps {
  searchParams: Promise<{ configurationId?: string }>
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

async function getConfiguration(id: string): Promise<Configuration | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('configurations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching configuration:', error)
    return null
  }

  return data as Configuration
}

async function generateQuoteNumber(): Promise<string> {
  const supabase = await createAdminClient()

  const currentYear = new Date().getFullYear()

  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .like('quote_number', `NAB-${currentYear}-%`)
    .order('quote_number', { ascending: false })
    .limit(1)

  let nextNumber = 1
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].quote_number.split('-')[2], 10)
    nextNumber = lastNumber + 1
  }

  return `NAB-${currentYear}-${String(nextNumber).padStart(4, '0')}`
}

export default async function NewQuotePage({ searchParams }: PageProps) {
  const params = await searchParams
  const [products, quoteNumber] = await Promise.all([
    getProducts(),
    generateQuoteNumber(),
  ])

  let configuration: Configuration | null = null
  if (params.configurationId) {
    configuration = await getConfiguration(params.configurationId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nová nabídka</h1>
        <p className="text-muted-foreground">
          {configuration
            ? `Vytvořeno z konfigurace zákazníka ${configuration.contact_name}`
            : 'Vytvořte novou nabídku od začátku'}
        </p>
      </div>

      <QuoteEditor
        quoteNumber={quoteNumber}
        products={products}
        configuration={configuration}
      />
    </div>
  )
}
