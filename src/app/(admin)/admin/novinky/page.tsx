'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Calendar, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { changelogVersions, CURRENT_VERSION } from '@/lib/changelog-data'
import {
  getTypeLabel,
  getTypeColor,
  type ChangeType,
} from '@/lib/changelog'
import {
  getLastSeenVersion,
  markCurrentVersionAsSeen,
  compareVersions,
} from '@/lib/changelog-storage'

export default function NovinkyPage() {
  const [typeFilter, setTypeFilter] = useState<ChangeType[]>([])

  // Get last seen version once on initial render (before marking as seen)
  const lastSeenVersion = useMemo(() => {
    const lastSeen = getLastSeenVersion()
    // Mark current version as seen when user visits this page
    markCurrentVersionAsSeen(CURRENT_VERSION)
    return lastSeen
  }, [])

  // Check if a version is newer than last seen
  const isNewVersion = (version: string): boolean => {
    if (!lastSeenVersion) return true
    return compareVersions(version, lastSeenVersion) > 0
  }

  // Toggle type filter
  const toggleTypeFilter = (type: ChangeType) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // Filter versions and changes based on type filter
  const filteredVersions = changelogVersions.map((version) => ({
    ...version,
    changes:
      typeFilter.length === 0
        ? version.changes
        : version.changes.filter((c) => typeFilter.includes(c.type)),
  })).filter((version) => version.changes.length > 0)

  const allTypes: ChangeType[] = ['feature', 'fix', 'improvement', 'breaking']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Novinky</h1>
            <p className="text-muted-foreground">
              Aktuální verze: <Badge variant="secondary">v{CURRENT_VERSION}</Badge>
            </p>
          </div>
        </div>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrovat
              {typeFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {typeFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {allTypes.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={typeFilter.includes(type)}
                onCheckedChange={() => toggleTypeFilter(type)}
              >
                <Badge className={`mr-2 ${getTypeColor(type)}`}>
                  {getTypeLabel(type)}
                </Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Changelog list */}
      <div className="space-y-6">
        {filteredVersions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Žádné novinky odpovídající filtru
            </CardContent>
          </Card>
        ) : (
          filteredVersions.map((version) => (
            <Card key={version.version} className="relative overflow-hidden">
              {/* New badge for unread versions */}
              {isNewVersion(version.version) && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-green-500 text-white">
                    Nové
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    Verze {version.version}
                  </CardTitle>
                  {version.date && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(version.date)}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {version.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Badge className={`shrink-0 ${getTypeColor(change.type)}`}>
                        {getTypeLabel(change.type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {change.userDescription || change.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// Format date to Czech locale
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}
