'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Waves, FileSpreadsheet, Package, Wrench, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiData {
  configurations: {
    total: number
    thisMonth: number
    lastMonth: number
  }
  quotes: {
    total: number
    active: number
    conversionRate: number
  }
  orders: {
    total: number
    active: number
    totalValue: number
  }
  production: {
    total: number
    inProgress: number
    completed: number
  }
}

interface DashboardKpiProps {
  data: KpiData
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    if (current > 0) {
      return (
        <span className="flex items-center text-xs text-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          Nové
        </span>
      )
    }
    return null
  }

  const change = ((current - previous) / previous) * 100

  if (change > 0) {
    return (
      <span className="flex items-center text-xs text-green-600">
        <TrendingUp className="w-3 h-3 mr-1" />
        +{change.toFixed(0)}%
      </span>
    )
  } else if (change < 0) {
    return (
      <span className="flex items-center text-xs text-red-600">
        <TrendingDown className="w-3 h-3 mr-1" />
        {change.toFixed(0)}%
      </span>
    )
  }

  return (
    <span className="flex items-center text-xs text-gray-500">
      <Minus className="w-3 h-3 mr-1" />
      0%
    </span>
  )
}

export function DashboardKpi({ data }: DashboardKpiProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Configurations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Poptávky</CardTitle>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Waves className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.configurations.thisMonth}</div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              tento měsíc
            </p>
            <TrendIndicator
              current={data.configurations.thisMonth}
              previous={data.configurations.lastMonth}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aktivní nabídky</CardTitle>
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileSpreadsheet className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.quotes.active}</div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              z {data.quotes.total} celkem
            </p>
            {data.quotes.conversionRate > 0 && (
              <span className="text-xs text-green-600">
                {data.quotes.conversionRate.toFixed(0)}% konverze
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Objednávky</CardTitle>
          <div className="p-2 bg-green-100 rounded-lg">
            <Package className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.orders.active}</div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              aktivních
            </p>
            <span className="text-xs font-medium text-green-600">
              {formatPrice(data.orders.totalValue)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Production */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ve výrobě</CardTitle>
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Wrench className="h-4 w-4 text-yellow-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.production.inProgress}</div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              z {data.production.total} zakázek
            </p>
            <span className="text-xs text-green-600">
              {data.production.completed} dokončeno
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
