import { Suspense } from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuotesTable } from '@/components/admin/quotes-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus } from 'lucide-react'
import type { Quote } from '@/lib/supabase/types'

async function getQuotes(): Promise<Quote[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching quotes:', error)
    return []
  }

  return data as Quote[]
}

function QuotesTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export default async function QuotesPage() {
  const quotes = await getQuotes()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Nabídky
          </h1>
          <p className="text-muted-foreground">
            Celkem {quotes.length} nabídek
          </p>
        </div>

        <Link href="/admin/nabidky/nova">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nová nabídka
          </Button>
        </Link>
      </div>

      <Suspense fallback={<QuotesTableSkeleton />}>
        <QuotesTable quotes={quotes} />
      </Suspense>
    </div>
  )
}
