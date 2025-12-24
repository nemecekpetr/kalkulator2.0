'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import type { Configuration } from '@/lib/supabase/types'
import { getShapeLabel, formatDimensions } from '@/lib/constants/configurator'

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

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Poslední konfigurace</CardTitle>
          <CardDescription>Nejnovější konfigurace z webu</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {configurations.length > 0 ? (
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
              {configurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(config.created_at), 'd.M. HH:mm', { locale: cs })}
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
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/nabidky/nova?configurationId=${config.id}`}>
                                <FileText className="w-4 h-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Vytvořit nabídku</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Zatím žádné konfigurace
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
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
