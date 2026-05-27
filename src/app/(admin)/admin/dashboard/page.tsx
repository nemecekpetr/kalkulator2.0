import { Suspense } from 'react'
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { RecentConfigurations } from '@/components/admin/recent-configurations'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { DashboardKpi } from '@/components/admin/dashboard-kpi'
import { DashboardFunnel } from '@/components/admin/dashboard-funnel'
import { PeriodSelector } from '@/components/admin/period-selector'
import { Skeleton } from '@/components/ui/skeleton'
import { parsePeriodParam, periodStartIso, type Period } from '@/lib/utils/period'

interface PageProps {
  searchParams: Promise<{ page?: string; period?: string }>
}

async function getFunnelData(period: Period) {
  const supabase = await createAdminClient()
  const startIso = periodStartIso(period)

  const configsQuery = supabase
    .from('configurations')
    .select('id', { count: 'exact', head: true })
    .eq('is_draft', false)
  const quotesQuery = supabase.from('quotes').select('id, status')
  const ordersQuery = supabase.from('orders').select('id, status').neq('status', 'cancelled')

  if (startIso) {
    configsQuery.gte('created_at', startIso)
    quotesQuery.gte('created_at', startIso)
    ordersQuery.gte('created_at', startIso)
  }

  const [configsRes, quotesRes, ordersRes] = await Promise.all([
    configsQuery,
    quotesQuery,
    ordersQuery,
  ])

  const quotes = quotesRes.data || []
  const orders = ordersRes.data || []
  return {
    configurations: configsRes.count || 0,
    quotes: quotes.length,
    acceptedQuotes: quotes.filter((q) => q.status === 'accepted').length,
    orders: orders.length,
  }
}

async function getConfigurations(page: number = 1, perPage: number = 5) {
  const supabase = await createAdminClient()

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await supabase
    .from('configurations')
    .select('*', { count: 'exact' })
    .eq('is_draft', false)
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
    .eq('is_draft', false)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })

  return data || []
}

async function getKpiData() {
  const supabase = await createAdminClient()
  const now = new Date()
  const thisMonthStart = startOfMonth(now).toISOString()
  const thisMonthEnd = endOfMonth(now).toISOString()
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
  const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

  // Fetch all KPI data in parallel
  const [
    configurationsTotal,
    configurationsThisMonth,
    configurationsLastMonth,
    quotesData,
    ordersData,
    productionData,
  ] = await Promise.all([
    // Total configurations (jen odeslané, ne rozpracované drafty)
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('is_draft', false),
    // This month configurations
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('is_draft', false)
      .gte('created_at', thisMonthStart)
      .lte('created_at', thisMonthEnd),
    // Last month configurations
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('is_draft', false)
      .gte('created_at', lastMonthStart)
      .lte('created_at', lastMonthEnd),
    // Quotes
    supabase
      .from('quotes')
      .select('id, status'),
    // Orders
    supabase
      .from('orders')
      .select('id, status, total_price'),
    // Production
    supabase
      .from('production_orders')
      .select('id, status'),
  ])

  // Process quotes
  const quotes = quotesData.data || []
  const activeQuotes = quotes.filter((q) => ['draft', 'sent'].includes(q.status)).length
  const acceptedQuotes = quotes.filter((q) => q.status === 'accepted').length
  // Conversion rate = % nabídek, které byly akceptovány. Status 'converted' v enumu
  // neexistuje (legacy překlep); skutečné značení akceptované nabídky je 'accepted'.
  const conversionRate = quotes.length > 0 ? (acceptedQuotes / quotes.length) * 100 : 0

  // Process orders
  const orders = ordersData.data || []
  const activeOrders = orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length
  const totalValue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total_price || 0), 0)

  // Process production
  const production = productionData.data || []
  const inProgressProduction = production.filter((p) => p.status === 'in_progress').length
  const completedProduction = production.filter((p) => p.status === 'completed').length

  const activeOrdersForFunnel = orders.filter((o) => o.status !== 'cancelled').length

  return {
    configurations: {
      total: configurationsTotal.count || 0,
      thisMonth: configurationsThisMonth.count || 0,
      lastMonth: configurationsLastMonth.count || 0,
    },
    quotes: {
      total: quotes.length,
      active: activeQuotes,
      accepted: acceptedQuotes,
      conversionRate,
    },
    orders: {
      total: orders.length,
      active: activeOrders,
      activeForFunnel: activeOrdersForFunnel,
      totalValue,
    },
    production: {
      total: production.length,
      inProgress: inProgressProduction,
      completed: completedProduction,
    },
  }
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const period = parsePeriodParam(params.period)
  const [
    { configurations, total, currentPage, totalPages },
    chartData,
    kpiData,
    funnelData,
  ] = await Promise.all([
    getConfigurations(page),
    getChartData(),
    getKpiData(),
    getFunnelData(period),
  ])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <Suspense fallback={<KpiLoading />}>
        <DashboardKpi data={kpiData} />
      </Suspense>

      {/* Conversion funnel s volbou období */}
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <PeriodSelector value={period} />
        </div>
        <DashboardFunnel data={funnelData} />
      </div>

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

function KpiLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
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
