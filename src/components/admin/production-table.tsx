'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
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
import { ClickableTableRow } from '@/components/admin/clickable-table-row'
import { StopPropagationCell } from '@/components/admin/stop-propagation-cell'
import { Eye } from 'lucide-react'
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
  return (
    <div className="space-y-4">
      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Zatím žádná výrobní zadání
              </TableCell>
            </TableRow>
          ) : (
            productionOrders.map((production) => (
              <ClickableTableRow key={production.id} href={`/admin/vyroba/${production.id}`}>
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
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/vyroba/${production.id}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
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
    </div>
  )
}
