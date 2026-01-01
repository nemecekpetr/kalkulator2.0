'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import { changelogVersions, CURRENT_VERSION } from '@/lib/changelog-data'
import { getTypeLabel, getTypeColor, type Change } from '@/lib/changelog'
import {
  getLastSeenVersion,
  compareVersions,
} from '@/lib/changelog-storage'

export function ChangelogWidget() {
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Get last 3 changes across all versions
  const recentChanges: { version: string; change: Change }[] = []
  for (const version of changelogVersions) {
    for (const change of version.changes) {
      recentChanges.push({ version: version.version, change })
      if (recentChanges.length >= 3) break
    }
    if (recentChanges.length >= 3) break
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Novinky
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1">
              {unreadCount} {unreadCount === 1 ? 'nová' : unreadCount < 5 ? 'nové' : 'nových'}
            </Badge>
          )}
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          v{CURRENT_VERSION}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentChanges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádné novinky
          </p>
        ) : (
          <>
            {recentChanges.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm"
              >
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-xs ${getTypeColor(item.change.type)}`}
                >
                  {getTypeLabel(item.change.type)}
                </Badge>
                <span className="text-muted-foreground line-clamp-1">
                  {item.change.scope && (
                    <span className="font-medium text-foreground">
                      {item.change.scope}:{' '}
                    </span>
                  )}
                  {item.change.description}
                </span>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link href="/admin/novinky">
                Zobrazit všechny
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
