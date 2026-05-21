'use client'

import { useState } from 'react'
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
import { ClickableTableRow } from '@/components/admin/clickable-table-row'
import { StopPropagationCell } from '@/components/admin/stop-propagation-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  Loader2,
  Mail,
} from 'lucide-react'
import type { Configuration, ConfigurationStatus } from '@/lib/supabase/types'
import { CONFIGURATION_STATUS_LABELS } from '@/lib/supabase/types'
import { getShapeLabel, formatDimensions } from '@/lib/constants/configurator'
import { deleteConfiguration, retryPipedriveSync } from '@/app/actions/admin-actions'
import {
  sendConfigurationReminder,
  sendConfigurationRemindersBulk,
  deleteDraftConfiguration,
  deleteDraftConfigurationsBulk,
} from '@/app/actions/draft-admin-actions'
import { toast } from 'sonner'
import { useAdminRole } from '@/hooks/use-admin-role'

interface ConfigurationsTableProps {
  configurations: Configuration[]
  currentPage: number
  totalPages: number
  total: number
  view: 'submitted' | 'draft'
}

export function ConfigurationsTable({
  configurations,
  currentPage,
  totalPages,
  total,
  view,
}: ConfigurationsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const userRole = useAdminRole()

  const isDraftView = view === 'draft'
  // V záložce Rozpracované smí připomínky posílat každý přihlášený uživatel
  const canSelect = userRole === 'admin' || isDraftView

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Připomínky
  const [reminderId, setReminderId] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [bulkReminderDialogOpen, setBulkReminderDialogOpen] = useState(false)

  const isAllSelected = configurations.length > 0 && selectedIds.size === configurations.length

  const toggleSelectAll = () => {
    if (selectedIds.size === configurations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(configurations.map((c) => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

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
      // Drafty mažou všichni uživatelé (akce omezená na is_draft);
      // odeslané konfigurace maže jen admin přes deleteConfiguration.
      const cfg = configurations.find((c) => c.id === deleteId)
      const result = cfg?.is_draft
        ? await deleteDraftConfiguration(deleteId)
        : await deleteConfiguration(deleteId)
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      // V záložce Rozpracované maže drafty každý uživatel (akce omezená na is_draft)
      if (isDraftView) {
        const result = await deleteDraftConfigurationsBulk(Array.from(selectedIds))
        if (result.success) {
          toast.success(`${result.deleted} konfigurací smazáno`)
          setSelectedIds(new Set())
          setBulkDeleteDialogOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || 'Chyba při mazání')
        }
        setBulkUpdating(false)
        return
      }

      const response = await fetch('/api/admin/configurations/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (response.ok) {
        toast.success(`${selectedIds.size} konfigurací smazáno`)
        setSelectedIds(new Set())
        setBulkDeleteDialogOpen(false)
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Chyba při mazání')
      }
    } catch {
      toast.error('Chyba připojení')
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/configurations/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      })
      if (response.ok) {
        toast.success(status === 'processed' ? 'Konfigurace označeny jako zpracované' : 'Stav změněn')
        setSelectedIds(new Set())
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Chyba při změně stavu')
      }
    } catch {
      toast.error('Chyba připojení')
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleSendReminder = async () => {
    if (!reminderId) return
    setSendingReminder(true)
    try {
      const result = await sendConfigurationReminder(reminderId)
      if (result.success) {
        toast.success('Připomínka byla odeslána')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se odeslat připomínku')
      }
    } catch {
      toast.error('Nepodařilo se odeslat připomínku')
    } finally {
      setSendingReminder(false)
      setReminderId(null)
    }
  }

  const handleBulkSendReminders = async () => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const result = await sendConfigurationRemindersBulk(Array.from(selectedIds))
      if (result.success) {
        toast.success(
          result.failed > 0
            ? `Připomínka odeslána: ${result.sent}, selhalo: ${result.failed}`
            : `Odesláno ${result.sent} připomínek`
        )
        setSelectedIds(new Set())
        setBulkReminderDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se odeslat připomínky')
      }
    } catch {
      toast.error('Chyba připojení')
    } finally {
      setBulkUpdating(false)
    }
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`/admin/konfigurace?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {canSelect && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            Vybráno: {selectedIds.size}
          </span>
          <div className="flex items-center gap-2">
            {isDraftView ? (
              <>
                <Button
                  size="sm"
                  disabled={bulkUpdating}
                  onClick={() => setBulkReminderDialogOpen(true)}
                >
                  {bulkUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Poslat připomínku
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkUpdating}
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Smazat
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkUpdating}
                  onClick={() => handleBulkStatusChange('processed')}
                >
                  {bulkUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Označit jako zpracované
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={bulkUpdating}
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Smazat
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Zrušit výběr
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {canSelect && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Datum</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Konfigurace</TableHead>
              <TableHead className="w-28">Stav</TableHead>
              <TableHead className="w-24">Pipedrive</TableHead>
              <TableHead className="w-40">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configurations.length > 0 ? (
              configurations.map((config) => (
                <ClickableTableRow key={config.id} href={`/admin/konfigurace/${config.id}`}>
                  {canSelect && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(config.id)}
                        onCheckedChange={() => toggleSelect(config.id)}
                      />
                    </TableCell>
                  )}
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
                    {config.is_draft ? (
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200"
                        >
                          Rozpracovaná
                        </Badge>
                        {config.reminder_sent_at ? (
                          <p className="text-xs text-[#48A9A6]">
                            Připomínka odeslána {format(new Date(config.reminder_sent_at), 'd.M.', { locale: cs })}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Bez připomínky</p>
                        )}
                      </div>
                    ) : (
                      (() => {
                        const status = (config.status as ConfigurationStatus) || 'new'
                        return (
                          <Badge
                            variant="outline"
                            className={
                              status === 'processed'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          >
                            {CONFIGURATION_STATUS_LABELS[status]}
                          </Badge>
                        )
                      })()
                    )}
                  </TableCell>
                  <TableCell>
                    {config.is_draft ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      getStatusBadge(config.pipedrive_status)
                    )}
                  </TableCell>
                  <StopPropagationCell>
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

                        {config.is_draft && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setReminderId(config.id)}
                                className={config.reminder_sent_at ? 'text-muted-foreground' : 'text-[#48A9A6]'}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {config.reminder_sent_at ? 'Poslat připomínku znovu' : 'Poslat připomínku'}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {config.is_draft && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(config.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Smazat</TooltipContent>
                          </Tooltip>
                        )}

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

                        {userRole === 'admin' && !config.is_draft && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!config.is_draft && config.pipedrive_status !== 'success' && (
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
                  </StopPropagationCell>
                </ClickableTableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canSelect ? 7 : 6} className="h-32 text-center text-muted-foreground">
                  Žádné konfigurace nenalezeny
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count and Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalPages > 1
            ? `Strana ${currentPage} z ${totalPages} (${total} celkem)`
            : `${total} konfigurací`}
        </p>
        {totalPages > 1 && (
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
        )}
      </div>

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

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat {selectedIds.size} konfigurací</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat {selectedIds.size} konfigurací? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single reminder confirmation dialog */}
      <AlertDialog open={!!reminderId} onOpenChange={() => setReminderId(null)}>
        <AlertDialogContent>
          {(() => {
            const c = configurations.find((x) => x.id === reminderId)
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Poslat připomínku?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Zákazníkovi {c?.contact_name} ({c?.contact_email}) se odešle e-mail
                    s odkazem na dokončení konfigurace.
                    {c?.reminder_sent_at && ' Připomínka už jednou odeslána byla.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={sendingReminder}>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSendReminder} disabled={sendingReminder}>
                    {sendingReminder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Odeslat připomínku
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk reminder confirmation dialog */}
      <AlertDialog open={bulkReminderDialogOpen} onOpenChange={setBulkReminderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poslat připomínku {selectedIds.size} zákazníkům</AlertDialogTitle>
            <AlertDialogDescription>
              Každému vybranému zákazníkovi se odešle e-mail s odkazem na dokončení
              konfigurace. Odeslané konfigurace ve výběru se přeskočí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSendReminders} disabled={bulkUpdating}>
              {bulkUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Odeslat připomínky
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
