'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Calendar, CheckCircle, XCircle } from 'lucide-react'

interface StatsProps {
  stats: {
    total_configurations: number
    today_count: number
    this_week_count: number
    this_month_count: number
    pipedrive_success: number
    pipedrive_error: number
    pipedrive_pending: number
  } | null
}

export function DashboardStats({ stats }: StatsProps) {
  const cards = [
    {
      title: 'Celkem konfigurace',
      value: stats?.total_configurations ?? 0,
      description: 'Všechny poptávky',
      icon: ClipboardList,
      color: 'text-[#01384B]',
      bgColor: 'bg-[#01384B]/10',
    },
    {
      title: 'Tento měsíc',
      value: stats?.this_month_count ?? 0,
      description: `Tento týden: ${stats?.this_week_count ?? 0}`,
      icon: Calendar,
      color: 'text-[#48A9A6]',
      bgColor: 'bg-[#48A9A6]/10',
    },
    {
      title: 'Úspěšně odesláno',
      value: stats?.pipedrive_success ?? 0,
      description: 'Do Pipedrive',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Chyby',
      value: stats?.pipedrive_error ?? 0,
      description: `Čekající: ${stats?.pipedrive_pending ?? 0}`,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
