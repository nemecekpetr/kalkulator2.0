'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface ActionItem {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  count?: number
  link: string
  linkText: string
}

interface ActionCenterProps {
  actions: ActionItem[]
}

export function ActionCenter({ actions }: ActionCenterProps) {
  if (actions.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-700">Vše v pořádku</p>
            <p className="text-sm text-green-600">Žádné akce nevyžadují pozornost</p>
          </div>
        </div>
      </Card>
    )
  }

  // Sort: critical first, then warning, then info
  const sortedActions = [...actions].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.type] - order[b.type]
  })

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedActions.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}
    </div>
  )
}

function ActionCard({ action }: { action: ActionItem }) {
  const getStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-50 hover:bg-red-100 border-red-200',
          number: 'text-red-600',
          text: 'text-red-700',
          link: 'text-red-600 hover:text-red-700',
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
          number: 'text-amber-600',
          text: 'text-amber-700',
          link: 'text-amber-600 hover:text-amber-700',
        }
      case 'info':
        return {
          bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
          number: 'text-blue-600',
          text: 'text-blue-700',
          link: 'text-blue-600 hover:text-blue-700',
        }
      default:
        return {
          bg: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
          number: 'text-gray-600',
          text: 'text-gray-700',
          link: 'text-gray-600 hover:text-gray-700',
        }
    }
  }

  const styles = getStyles(action.type)

  return (
    <Link
      href={action.link}
      className={cn(
        "block rounded-xl border p-4 transition-colors",
        styles.bg
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Big number */}
          {action.count !== undefined && action.count > 0 && (
            <p className={cn("text-4xl font-bold", styles.number)}>
              {action.count}
            </p>
          )}
          {/* Title */}
          <p className={cn("font-medium mt-1", styles.text)}>
            {action.title}
          </p>
        </div>
        <ArrowRight className={cn("h-5 w-5 shrink-0 mt-1", styles.link)} />
      </div>
    </Link>
  )
}
