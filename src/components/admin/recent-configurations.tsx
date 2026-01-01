'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Pencil,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { Configuration } from '@/lib/supabase/types'
import { getShapeLabel, formatDimensions } from '@/lib/constants/configurator'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'new' | 'errors'

interface RecentConfigurationsProps {
  configurations: Configuration[]
  currentPage: number
  totalPages: number
  total: number
}

export function RecentConfigurations({
  configurations,
  currentPage,
  totalPages,
  total,
}: RecentConfigurationsProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')

  // Calculate counts for badges
  const counts = useMemo(() => ({
    all: configurations.length,
    new: configurations.filter(c => c.status === 'new').length,
    errors: configurations.filter(c => c.pipedrive_status === 'error').length,
  }), [configurations])

  // Filter configurations based on selected tab
  const filteredConfigurations = useMemo(() => {
    switch (filter) {
      case 'new':
        return configurations.filter(c => c.status === 'new')
      case 'errors':
        return configurations.filter(c => c.pipedrive_status === 'error')
      default:
        return configurations
    }
  }, [configurations, filter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Odesláno
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Chyba
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Čeká
          </Badge>
        )
    }
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`/admin/dashboard?${params.toString()}`)
  }

  // Check if configuration is "new" (unprocessed)
  const isNewConfiguration = (config: Configuration) => config.status === 'new'
  const hasError = (config: Configuration) => config.pipedrive_status === 'error'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Konfigurace</CardTitle>
            <CardDescription>Poslední poptávky z webu</CardDescription>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                Vše
                <Badge variant="secondary" className="text-xs">
                  {counts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                Nové
                {counts.new > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {counts.new}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">0</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="errors" className="gap-2">
                Chyby
                {counts.errors > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {counts.errors}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">0</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredConfigurations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Konfigurace</TableHead>
                <TableHead className="w-24">Pipedrive</TableHead>
                <TableHead className="w-44">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConfigurations.map((config) => {
                const isNew = isNewConfiguration(config)
                const hasErr = hasError(config)

                return (
                  <TableRow
                    key={config.id}
                    className={cn(
                      isNew && 'bg-yellow-50/50 border-l-4 border-l-yellow-500',
                      hasErr && !isNew && 'bg-red-50/50 border-l-4 border-l-red-500'
                    )}
                  >
                    <TableCell>
                      <div>
                        {isNew && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 mb-1 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Nezpracováno
                          </Badge>
                        )}
                        <p className="text-muted-foreground">
                          {format(new Date(config.created_at), 'd.M. HH:mm', { locale: cs })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{config.contact_name}</p>
                        <p className="text-sm text-muted-foreground">{config.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {getShapeLabel(config.pool_shape)},{' '}
                        {formatDimensions(config.pool_shape, config.dimensions)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(config.pipedrive_status)}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/admin/konfigurace/${config.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zobrazit</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/admin/konfigurace/${config.id}/upravit`}>
                                  <Pencil className="w-4 h-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upravit</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={isNew ? "default" : "ghost"}
                                size={isNew ? "sm" : "icon"}
                                asChild
                              >
                                <Link href={`/admin/nabidky/nova?configurationId=${config.id}`}>
                                  <FileText className="w-4 h-4" />
                                  {isNew && <span className="ml-1">Nabídka</span>}
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Vytvořit nabídku</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {filter === 'all' && 'Zatím žádné konfigurace'}
            {filter === 'new' && 'Žádné nové konfigurace'}
            {filter === 'errors' && 'Žádné chyby synchronizace'}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && filter === 'all' && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Strana {currentPage} z {totalPages} ({total} celkem)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Předchozí
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Další
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
