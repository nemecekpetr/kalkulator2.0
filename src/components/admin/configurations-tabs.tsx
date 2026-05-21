'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ConfigurationsTabsProps {
  submittedCount: number
  draftCount: number
}

export function ConfigurationsTabs({ submittedCount, draftCount }: ConfigurationsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('draft') || 'submitted'

  const tabs = [
    { value: 'submitted', label: 'Odeslané', count: submittedCount, accent: false },
    { value: 'draft', label: 'Rozpracované', count: draftCount, accent: true },
  ]

  const selectTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'submitted') {
      params.delete('draft')
    } else {
      params.set('draft', value)
    }
    // Přepnutí záložky resetuje stránkování
    params.delete('page')
    router.push(`/admin/konfigurace?${params.toString()}`)
  }

  return (
    <div className="border-b">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = active === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => selectTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-[#48A9A6] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold',
                    tab.accent
                      ? 'bg-[#FF8621] text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
