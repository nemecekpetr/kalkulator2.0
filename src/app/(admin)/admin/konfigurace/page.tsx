import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { ConfigurationsTable } from '@/components/admin/configurations-table'
import { ConfigurationsFilters } from '@/components/admin/configurations-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    status?: string
    pipedrive?: string
    search?: string
    page?: string
  }>
}

async function getConfigurations(filters: {
  status?: string
  pipedrive?: string
  search?: string
  page?: string
}) {
  const supabase = await createAdminClient()
  const page = parseInt(filters.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('configurations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply configuration status filter (new/processed)
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Apply pipedrive status filter (success/error/pending)
  if (filters.pipedrive && filters.pipedrive !== 'all') {
    query = query.eq('pipedrive_status', filters.pipedrive)
  }

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%,contact_phone.ilike.%${filters.search}%`
    )
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching configurations:', error)
    return { configurations: [], total: 0 }
  }

  return {
    configurations: data || [],
    total: count || 0,
  }
}

export default async function ConfigurationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { configurations, total } = await getConfigurations(params)
  const currentPage = parseInt(params.page || '1')
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Konfigurace</h1>
          <p className="text-muted-foreground">
            Celkem {total} konfigurace
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/konfigurace/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nová konfigurace
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <ConfigurationsFilters />

      {/* Table */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ConfigurationsTable
          configurations={configurations}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
        />
      </Suspense>
    </div>
  )
}
