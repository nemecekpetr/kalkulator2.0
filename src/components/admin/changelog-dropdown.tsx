'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Sparkles, ExternalLink, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getTypeLabel, getTypeColor, type Change } from '@/lib/changelog'
import {
  getLastSeenVersion,
  markCurrentVersionAsSeen,
  compareVersions,
} from '@/lib/changelog-storage'
import { changelogVersions, CURRENT_VERSION } from '@/lib/changelog-data'

export function ChangelogDropdown() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Calculate unread count on mount
  useEffect(() => {
    const lastSeen = getLastSeenVersion()
    if (!lastSeen) {
      setUnreadCount(changelogVersions.length)
    } else {
      const unread = changelogVersions.filter(
        (v) => compareVersions(v.version, lastSeen) > 0
      ).length
      setUnreadCount(unread)
    }
  }, [])

  // Mark as read when dropdown opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (open && unreadCount > 0) {
        // Mark current version as seen after a short delay
        setTimeout(() => {
          markCurrentVersionAsSeen(CURRENT_VERSION)
          setUnreadCount(0)
        }, 1000)
      }
    },
    [unreadCount]
  )

  // Get recent changes (last 5)
  const recentChanges: { version: string; change: Change }[] = []
  for (const version of changelogVersions) {
    for (const change of version.changes) {
      recentChanges.push({ version: version.version, change })
      if (recentChanges.length >= 5) break
    }
    if (recentChanges.length >= 5) break
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sparkles className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
          <span className="sr-only">Novinky</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Novinky</span>
          <Badge variant="secondary" className="text-xs">
            v{CURRENT_VERSION}
          </Badge>
        </div>
        <DropdownMenuSeparator />

        {recentChanges.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            Žádné novinky
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {recentChanges.map((item, index) => (
              <div
                key={index}
                className="px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${getTypeColor(item.change.type)}`}
                  >
                    {getTypeLabel(item.change.type)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      {item.change.userDescription || item.change.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/admin/novinky"
            className="flex items-center justify-between cursor-pointer"
          >
            <span>Zobrazit všechny novinky</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>
        {unreadCount > 0 && (
          <DropdownMenuItem
            onClick={() => {
              markCurrentVersionAsSeen(CURRENT_VERSION)
              setUnreadCount(0)
            }}
            className="cursor-pointer"
          >
            <Check className="h-4 w-4 mr-2" />
            Označit vše jako přečtené
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
