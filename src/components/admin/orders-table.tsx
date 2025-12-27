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
  return (
    <div className="space-y-4">
      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Zatím žádné objednávky
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <ClickableTableRow key={order.id} href={`/admin/objednavky/${order.id}`}>
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
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/objednavky/${order.id}`}>
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
        {orders.length} objednávek
      </p>
    </div>
  )
}
