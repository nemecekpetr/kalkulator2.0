'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import type { Configuration, UserRole } from '@/lib/supabase/types'
import { getShapeLabel, formatDimensions } from '@/lib/constants/configurator'
import { deleteConfiguration, retryPipedriveSync } from '@/app/actions/admin-actions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ConfigurationsTableProps {
  configurations: Configuration[]
  currentPage: number
  totalPages: number
  total: number
}

export function ConfigurationsTable({
  configurations,
  currentPage,
  totalPages,
  total,
}: ConfigurationsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single() as { data: { role: string } | null }
        if (profile) {
          setUserRole(profile.role as UserRole)
        }
      }
    }
    fetchUserRole()
  }, [])

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

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const result = await deleteConfiguration(deleteId)
      if (result.success) {
        toast.success('Konfigurace byla smazána')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se smazat konfiguraci')
      }
    } catch {
      toast.error('Nepodařilo se smazat konfiguraci')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleRetry = async (id: string) => {
    setRetryingId(id)
    try {
      const result = await retryPipedriveSync(id)
      if (result.success) {
        toast.success('Konfigurace byla znovu odeslána do Pipedrive')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se odeslat do Pipedrive')
      }
    } catch {
      toast.error('Nepodařilo se odeslat do Pipedrive')
    } finally {
      setRetryingId(null)
    }
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`/admin/konfigurace?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Konfigurace</TableHead>
              <TableHead className="w-24">Pipedrive</TableHead>
              <TableHead className="w-40">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configurations.length > 0 ? (
              configurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="text-muted-foreground">
                    <div>
                      <p>{format(new Date(config.created_at), 'd.M.yyyy', { locale: cs })}</p>
                      <p className="text-xs">{format(new Date(config.created_at), 'HH:mm', { locale: cs })}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{config.contact_name}</p>
                      <p className="text-sm text-muted-foreground">{config.contact_email}</p>
                      {config.contact_phone && (
                        <p className="text-sm text-muted-foreground">{config.contact_phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {getShapeLabel(config.pool_shape)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDimensions(config.pool_shape, config.dimensions)}
                      </p>
                    </div>
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

                        {userRole === 'admin' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {config.pipedrive_status !== 'success' && (
                                <DropdownMenuItem
                                  onClick={() => handleRetry(config.id)}
                                  disabled={retryingId === config.id}
                                >
                                  <RefreshCw className={`w-4 h-4 mr-2 ${retryingId === config.id ? 'animate-spin' : ''}`} />
                                  {retryingId === config.id ? 'Odesílám...' : 'Znovu odeslat do Pipedrive'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeleteId(config.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Smazat
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Žádné konfigurace nenalezeny
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tuto konfiguraci?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Konfigurace bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Mažu...' : 'Smazat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
