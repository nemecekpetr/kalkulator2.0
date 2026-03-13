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
import type { Order, OrderStatus } from '@/lib/supabase/types'
import { ORDER_STATUS_LABELS } from '@/lib/supabase/types'

interface OrderWithQuote extends Order {
  quotes?: { quote_number: string } | null
}

interface OrdersTableProps {
  orders: OrderWithQuote[]
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  created: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  in_production: 'bg-yellow-100 text-yellow-800',
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter()
  const userRole = useAdminRole()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)))
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
      const response = await fetch(`/api/admin/orders/${deleteId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Objednávka byla smazána')
        router.refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Nepodařilo se smazat objednávku')
      }
    } catch {
      toast.error('Nepodařilo se smazat objednávku')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (response.ok) {
        toast.success(`${selectedIds.size} objednávek smazáno`)
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

  const handleBulkStatusChange = async (status: OrderStatus) => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/orders/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      })
      if (response.ok) {
        toast.success(`Stav objednávek změněn na "${ORDER_STATUS_LABELS[status]}"`)
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
                <DropdownMenuItem onClick={() => handleBulkStatusChange('created')}>
                  {ORDER_STATUS_LABELS.created}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('sent')}>
                  {ORDER_STATUS_LABELS.sent}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('in_production')}>
                  {ORDER_STATUS_LABELS.in_production}
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
            <TableHead>Číslo objednávky</TableHead>
            <TableHead>Zákazník</TableHead>
            <TableHead>Stav</TableHead>
            <TableHead>Nabídka</TableHead>
            <TableHead className="text-right">Celková cena</TableHead>
            <TableHead>Vytvořeno</TableHead>
            <TableHead className="text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={userRole === 'admin' ? 8 : 7} className="text-center py-8 text-muted-foreground">
                Zatím žádné objednávky
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <ClickableTableRow key={order.id} href={`/admin/objednavky/${order.id}`}>
                {userRole === 'admin' && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(order.id)}
                      onCheckedChange={() => toggleSelect(order.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {order.order_number}
                </TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </TableCell>
                <StopPropagationCell>
                  {order.quotes ? (
                    <Link
                      href={`/admin/nabidky/${order.quote_id}`}
                      className="text-primary hover:underline"
                    >
                      {order.quotes.quote_number}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </StopPropagationCell>
                <TableCell className="text-right font-semibold">
                  {formatPrice(order.total_price)}
                </TableCell>
                <TableCell>
                  {format(new Date(order.created_at), 'd. M. yyyy', { locale: cs })}
                </TableCell>
                <StopPropagationCell className="text-right">
                  <TooltipProvider>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/objednavky/${order.id}`}>
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
                              <Link href={`/admin/objednavky/${order.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Zobrazit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status === 'created' ? (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeleteId(order.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Smazat
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Smazat
                              </DropdownMenuItem>
                            )}
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
        {orders.length} objednávek
      </p>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tuto objednávku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Objednávka bude trvale odstraněna.
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
            <AlertDialogTitle>Smazat {selectedIds.size} objednávek</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat {selectedIds.size} objednávek? Tato akce je nevratná.
              Lze mazat pouze objednávky ve stavu &quot;Vytvořena&quot;.
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
