import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { ConfigurationsTable } from '@/components/admin/configurations-table'
import { ConfigurationsFilters } from '@/components/admin/configurations-filters'
import { ConfigurationsTabs } from '@/components/admin/configurations-tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    status?: string
    pipedrive?: string
    draft?: string
    search?: string
    page?: string
  }>
}

async function getConfigurations(filters: {
  status?: string
  pipedrive?: string
  draft?: string
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

  // Filtr odeslání: výchozí 'submitted' = jen odeslané konfigurace (zachová původní chování)
  const draftFilter = filters.draft || 'submitted'
  if (draftFilter === 'submitted') {
    query = query.eq('is_draft', false)
  } else if (draftFilter === 'draft') {
    // Anonymizované drafty (GDPR po 1 měsíci) se v seznamu nezobrazují
    query = query.eq('is_draft', true).is('anonymized_at', null)
  }
  // 'all' → bez filtru

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

// Statistiky konverze konfigurátoru — odeslané, rozpracované, oživené
async function getConfigurationStats() {
  const supabase = await createAdminClient()

  const [submitted, activeDrafts, allUnconverted, revived] = await Promise.all([
    // Odeslané poptávky (vč. povýšených draftů)
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('is_draft', false)
      .eq('is_deleted', false),
    // Aktivní (neanonymizované) rozpracované konfigurace
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('is_draft', true)
      .is('anonymized_at', null)
      .eq('is_deleted', false),
    // Všechny neodeslané drafty vč. anonymizovaných — stabilní jmenovatel konverze
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('is_draft', true)
      .eq('is_deleted', false),
    // Oživené — draft, který se odeslal po zaslané připomínce
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('was_draft', true)
      .eq('is_draft', false)
      .not('reminder_sent_at', 'is', null)
      .eq('is_deleted', false),
  ])

  const submittedCount = submitted.count || 0
  const draftCount = activeDrafts.count || 0
  const revivedCount = revived.count || 0
  const withContact = submittedCount + (allUnconverted.count || 0)
  const conversion = withContact > 0 ? Math.round((submittedCount / withContact) * 100) : 0

  return { submittedCount, draftCount, revivedCount, conversion }
}

function StatCard({ label, value, hint, accent }: {
  label: string
  value: string
  hint: string
  accent?: 'teal' | 'amber'
}) {
  const valueColor =
    accent === 'teal' ? 'text-[#48A9A6]' : accent === 'amber' ? 'text-[#FF8621]' : 'text-foreground'
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export default async function ConfigurationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [{ configurations, total }, stats] = await Promise.all([
    getConfigurations(params),
    getConfigurationStats(),
  ])
  const currentPage = parseInt(params.page || '1')
  const totalPages = Math.ceil(total / 20)
  const view = params.draft === 'draft' ? 'draft' : 'submitted'

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

      {/* Statistiky konverze */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Odeslané"
          value={String(stats.submittedCount)}
          hint="dokončené poptávky"
          accent="teal"
        />
        <StatCard
          label="Rozpracované"
          value={String(stats.draftCount)}
          hint="kontakt zadán, neodesláno"
          accent="amber"
        />
        <StatCard
          label="Oživené"
          value={String(stats.revivedCount)}
          hint="draft odeslán po připomínce"
          accent="teal"
        />
        <StatCard
          label="Konverze"
          value={`${stats.conversion} %`}
          hint="odeslané / všechny s kontaktem"
        />
      </div>

      {/* Záložky Odeslané / Rozpracované */}
      <ConfigurationsTabs
        submittedCount={stats.submittedCount}
        draftCount={stats.draftCount}
      />

      {/* Filters */}
      <ConfigurationsFilters />

      {/* Table */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ConfigurationsTable
          configurations={configurations}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          view={view}
        />
      </Suspense>
    </div>
  )
}
