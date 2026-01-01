'use client'

import { Button } from '@/components/ui/button'
import { Plus, FileText, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const actions = [
    {
      label: 'Nová nabídka',
      icon: FileText,
      href: '/admin/nabidky/nova',
      variant: 'default' as const,
    },
    {
      label: 'Přidat poptávku',
      icon: Plus,
      href: '/admin/konfigurace/nova',
      variant: 'outline' as const,
    },
    {
      label: 'Sync produkty',
      icon: RefreshCcw,
      href: '/admin/produkty',
      variant: 'outline' as const,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            asChild
          >
            <Link href={action.href}>
              <Icon className="h-4 w-4 mr-2" />
              {action.label}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
