import { Suspense } from 'react'
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { RecentConfigurations } from '@/components/admin/recent-configurations'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { DashboardKpi } from '@/components/admin/dashboard-kpi'
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
    // Total configurations
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true }),
    // This month configurations
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart)
      .lte('created_at', thisMonthEnd),
    // Last month configurations
    supabase
      .from('configurations')
      .select('id', { count: 'exact', head: true })
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
  const convertedQuotes = quotes.filter((q) => q.status === 'converted').length
  const conversionRate = quotes.length > 0 ? (convertedQuotes / quotes.length) * 100 : 0

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

  return {
    configurations: {
      total: configurationsTotal.count || 0,
      thisMonth: configurationsThisMonth.count || 0,
      lastMonth: configurationsLastMonth.count || 0,
    },
    quotes: {
      total: quotes.length,
      active: activeQuotes,
      conversionRate,
    },
    orders: {
      total: orders.length,
      active: activeOrders,
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
  const [{ configurations, total, currentPage, totalPages }, chartData, kpiData] = await Promise.all([
    getConfigurations(page),
    getChartData(),
    getKpiData(),
  ])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <Suspense fallback={<KpiLoading />}>
        <DashboardKpi data={kpiData} />
      </Suspense>

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
