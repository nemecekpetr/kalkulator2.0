'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, FileDown, Pencil, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'
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
import { formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import { toast } from 'sonner'
import { useAdminRole } from '@/hooks/use-admin-role'
import type { Quote, QuoteStatus } from '@/lib/supabase/types'
import { QUOTE_STATUS_LABELS } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'

interface QuotesTableProps {
  quotes: Quote[]
}

export function QuotesTable({ quotes }: QuotesTableProps) {
  const router = useRouter()
  const userRole = useAdminRole()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const isAllSelected = quotes.length > 0 && selectedIds.size === quotes.length

  const toggleSelectAll = () => {
    if (selectedIds.size === quotes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(quotes.map((q) => q.id)))
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/quotes/${deleteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Nabídka byla smazána')
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Nepodařilo se smazat nabídku')
      }
    } catch {
      toast.error('Nepodařilo se smazat nabídku')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/quotes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (response.ok) {
        toast.success(`${selectedIds.size} nabídek smazáno`)
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

  const handleBulkStatusChange = async (status: QuoteStatus) => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/quotes/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      })
      if (response.ok) {
        toast.success(`Stav nabídek změněn na "${QUOTE_STATUS_LABELS[status]}"`)
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
                <DropdownMenuItem onClick={() => handleBulkStatusChange('draft')}>
                  Koncept
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('sent')}>
                  Odeslaná
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusChange('rejected')}>
                  Zamítnutá
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
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {userRole === 'admin' && (
                <TableHead className="w-12">
                  <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
              )}
              <TableHead>Číslo nabídky</TableHead>
              <TableHead>Zákazník</TableHead>
              <TableHead className="w-28">Stav</TableHead>
              <TableHead className="text-right">Celkem</TableHead>
              <TableHead>Vytvořeno</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={userRole === 'admin' ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  Žádné nabídky nenalezeny
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <ClickableTableRow
                  key={quote.id}
                  href={`/admin/nabidky/${quote.id}`}
                >
                  {userRole === 'admin' && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(quote.id)}
                        onCheckedChange={() => toggleSelect(quote.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="font-medium text-primary">
                      {quote.quote_number}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{quote.customer_name}</p>
                      {quote.customer_email && (
                        <p className="text-sm text-muted-foreground">
                          {quote.customer_email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = (quote.status as QuoteStatus) || 'draft'
                      const colorMap: Record<QuoteStatus, string> = {
                        draft: 'bg-gray-50 text-gray-700 border-gray-200',
                        sent: 'bg-blue-50 text-blue-700 border-blue-200',
                        accepted: 'bg-green-50 text-green-700 border-green-200',
                        rejected: 'bg-red-50 text-red-700 border-red-200',
                      }
                      return (
                        <Badge variant="outline" className={colorMap[status]}>
                          {QUOTE_STATUS_LABELS[status]}
                        </Badge>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(quote.total_price)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(quote.created_at), {
                      addSuffix: true,
                      locale: cs,
                    })}
                  </TableCell>
                  <StopPropagationCell>
                    <TooltipProvider>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/nabidky/${quote.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zobrazit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/nabidky/${quote.id}/upravit`}>
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upravit</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/nabidky/${quote.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Zobrazit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/nabidky/${quote.id}/upravit`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Upravit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/api/admin/quotes/${quote.id}/pdf`} download>
                              <FileDown className="w-4 h-4 mr-2" />
                              Stáhnout PDF
                            </a>
                          </DropdownMenuItem>
                          {userRole === 'admin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeleteId(quote.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Smazat
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    </TooltipProvider>
                  </StopPropagationCell>
                </ClickableTableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {quotes.length} nabídek
      </p>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tuto nabídku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Nabídka bude trvale odstraněna.
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
            <AlertDialogTitle>Smazat {selectedIds.size} nabídek</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat {selectedIds.size} nabídek? Tato akce je nevratná.
              Akceptované nabídky nelze smazat.
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
