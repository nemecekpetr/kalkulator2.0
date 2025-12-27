import { Suspense } from 'react'
import { subDays } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { RecentConfigurations } from '@/components/admin/recent-configurations'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { Skeleton } from '@/components/ui/skeleton'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

async function getConfigurations(page: number = 1, perPage: number = 5) {
  const supabase = await createAdminClient()

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await supabase
    .from('configurations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  return {
    configurations: data || [],
    total: count || 0,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / perPage),
  }
}

async function getChartData() {
  const supabase = await createAdminClient()
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const { data } = await supabase
    .from('configurations')
    .select('created_at, pool_shape, color')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })

  return data || []
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const [{ configurations, total, currentPage, totalPages }, chartData] = await Promise.all([
    getConfigurations(page),
    getChartData(),
  ])

  return (
    <div className="space-y-6">
      {/* Recent configurations */}
      <Suspense fallback={<RecentLoading />}>
        <RecentConfigurations
          configurations={configurations}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
        />
      </Suspense>

      {/* Charts */}
      <Suspense fallback={<ChartsLoading />}>
        <DashboardCharts data={chartData} />
      </Suspense>
    </div>
  )
}

function ChartsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="col-span-2 h-80" />
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  )
}

function RecentLoading() {
  return <Skeleton className="h-96" />
}
