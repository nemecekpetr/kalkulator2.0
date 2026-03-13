'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Eye, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminRole } from '@/hooks/use-admin-role'
import type { ProductionOrder, ProductionStatus } from '@/lib/supabase/types'
import { PRODUCTION_STATUS_LABELS } from '@/lib/supabase/types'

interface ProductionOrderWithOrder extends ProductionOrder {
  orders?: { order_number: string; customer_name: string } | null
}

interface ProductionTableProps {
  productionOrders: ProductionOrderWithOrder[]
}

const STATUS_COLORS: Record<ProductionStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function ProductionTable({ productionOrders }: ProductionTableProps) {
  const router = useRouter()
  const userRole = useAdminRole()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const isAllSelected = productionOrders.length > 0 && selectedIds.size === productionOrders.length

  const toggleSelectAll = () => {
    if (selectedIds.size === productionOrders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(productionOrders.map((p) => p.id)))
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

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/production/${deleteId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Výrobní zadání bylo smazáno')
        router.refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Nepodařilo se smazat výrobní zadání')
      }
    } catch {
      toast.error('Nepodařilo se smazat výrobní zadání')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/production/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (response.ok) {
        toast.success(`${selectedIds.size} výrobních zadání smazáno`)
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

  const handleBulkStatusChange = async (status: ProductionStatus) => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/production/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      })
      if (response.ok) {
        toast.success(`Stav výrobních zadání změněn na "${PRODUCTION_STATUS_LABELS[status]}"`)
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

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {userRole === 'admin' && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            Vybráno: {selectedIds.size}
          </span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkUpdating}>
                  {bulkUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Změnit stav
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('pending')}>
                  {PRODUCTION_STATUS_LABELS.pending}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('in_progress')}>
                  {PRODUCTION_STATUS_LABELS.in_progress}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('completed')}>
                  {PRODUCTION_STATUS_LABELS.completed}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkStatusChange('cancelled')}>
                  {PRODUCTION_STATUS_LABELS.cancelled}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Zrušit výběr
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
          </div>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {userRole === 'admin' && (
              <TableHead className="w-12">
                <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
            )}
            <TableHead>Číslo výrobáku</TableHead>
            <TableHead>Objednávka</TableHead>
            <TableHead>Zákazník</TableHead>
            <TableHead>Bazén</TableHead>
            <TableHead>Stav</TableHead>
            <TableHead>Vytvořeno</TableHead>
            <TableHead className="text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productionOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={userRole === 'admin' ? 8 : 7} className="text-center py-8 text-muted-foreground">
                Zatím žádná výrobní zadání
              </TableCell>
            </TableRow>
          ) : (
            productionOrders.map((production) => (
              <ClickableTableRow key={production.id} href={`/admin/vyroba/${production.id}`}>
                {userRole === 'admin' && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(production.id)}
                      onCheckedChange={() => toggleSelect(production.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {production.production_number}
                </TableCell>
                <StopPropagationCell>
                  {production.orders ? (
                    <Link
                      href={`/admin/objednavky/${production.order_id}`}
                      className="text-primary hover:underline"
                    >
                      {production.orders.order_number}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </StopPropagationCell>
                <TableCell>{production.orders?.customer_name || '-'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {production.pool_dimensions && (
                      <span className="font-medium">{production.pool_dimensions}</span>
                    )}
                    {production.pool_type && (
                      <span className="text-muted-foreground ml-1">
                        ({production.pool_type === 'overflow' ? 'přeliv' : 'skimmer'})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[production.status]}>
                    {PRODUCTION_STATUS_LABELS[production.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(production.created_at), 'd. M. yyyy', { locale: cs })}
                </TableCell>
                <StopPropagationCell className="text-right">
                  <TooltipProvider>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/vyroba/${production.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zobrazit</TooltipContent>
                      </Tooltip>

                      {userRole === 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/vyroba/${production.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Zobrazit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setDeleteId(production.id)}
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
          )}
        </TableBody>
      </Table>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {productionOrders.length} výrobních zadání
      </p>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat toto výrobní zadání?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Výrobní zadání bude trvale odstraněno.
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
            <AlertDialogTitle>Smazat {selectedIds.size} výrobních zadání</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat {selectedIds.size} výrobních zadání? Tato akce je nevratná.
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
    </div>
  )
}
