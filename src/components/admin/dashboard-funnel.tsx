'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, Waves, FileSpreadsheet, CheckCircle2, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FunnelData {
  configurations: number
  quotes: number
  acceptedQuotes: number
  orders: number
}

interface DashboardFunnelProps {
  data: FunnelData
}

interface Stage {
  label: string
  count: number
  previousCount: number | null
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

function formatPercent(current: number, previous: number | null): string | null {
  if (previous === null || previous === 0) return null
  const pct = (current / previous) * 100
  return `${pct.toFixed(0)} %`
}

export function DashboardFunnel({ data }: DashboardFunnelProps) {
  const stages: Stage[] = [
    {
      label: 'Poptávky',
      count: data.configurations,
      previousCount: null,
      icon: Waves,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Nabídky',
      count: data.quotes,
      previousCount: data.configurations,
      icon: FileSpreadsheet,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Akceptované',
      count: data.acceptedQuotes,
      previousCount: data.quotes,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Objednávky',
      count: data.orders,
      previousCount: data.acceptedQuotes,
      icon: Package,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Konverzní cesta</CardTitle>
        <p className="text-xs text-muted-foreground">
          Kolik poptávek prochází jednotlivými fázemi obchodního procesu
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:items-stretch">
          {stages.map((stage, idx) => {
            const Icon = stage.icon
            const pct = formatPercent(stage.count, stage.previousCount)
            const isLast = idx === stages.length - 1
            return (
              <div
                key={stage.label}
                className={`contents`}
              >
                <div className="rounded-md border p-4 lg:col-span-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {stage.label}
                    </span>
                    <div className={`p-1.5 rounded ${stage.iconBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${stage.iconColor}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{stage.count}</div>
                  {pct && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{pct}</span>
                      <span> z předchozí fáze</span>
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div className="hidden lg:flex items-center justify-center text-muted-foreground">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
