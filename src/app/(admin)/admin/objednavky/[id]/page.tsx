import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Waves,
  FileText,
  Building2,
  FileDown,
  Pencil,
  ChevronDown,
  Printer,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { CreateProductionButton } from '@/components/admin/create-production-button'
import type { Order, OrderItem, PoolDimensions } from '@/lib/supabase/types'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'
import { QUOTE_CATEGORY_LABELS } from '@/lib/constants/categories'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

interface PoolConfig {
  shape?: string
  type?: string
  dimensions?: PoolDimensions
  color?: string
  stairs?: string
  technology?: string | string[]
  heating?: string
  roofing?: string
}

// Use centralized category labels (with proper Czech diacritics)
const CATEGORY_LABELS = QUOTE_CATEGORY_LABELS

async function getOrder(id: string) {
  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, quotes(quote_number)')
    .eq('id', id)
    .single()

  if (error || !order) {
    return null
  }

  // Fetch items
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('sort_order', { ascending: true })

  // Fetch production order if exists
  const { data: productionOrder } = await supabase
    .from('production_orders')
    .select('id, production_number')
    .eq('order_id', id)
    .single()

  return {
    ...order,
    items: items || [],
    production: productionOrder || null,
  } as Order & {
    items: OrderItem[]
    quotes?: { quote_number: string } | null
    production: { id: string; production_number: string } | null
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/objednavky">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.order_number}</h1>
              <OrderStatusBadge
                orderId={order.id}
                status={order.status}
              />
            </div>
            <p className="text-muted-foreground">
              Vytvořeno {format(new Date(order.created_at), 'd. MMMM yyyy', { locale: cs })}
              {order.quotes && (
                <>
                  {' '}| Z nabídky{' '}
                  <Link
                    href={`/admin/nabidky/${order.quote_id}`}
                    className="text-primary hover:underline"
                  >
                    {order.quotes.quote_number}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreateProductionButton
            orderId={order.id}
            existingProductionId={order.production?.id}
            existingProductionNumber={order.production?.production_number}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Stáhnout PDF
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/api/admin/orders/${order.id}/pdf`} download className="cursor-pointer">
                  <Mail className="w-4 h-4 mr-2" />
                  Pro email (menší soubor)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/admin/orders/${order.id}/pdf?quality=print`} download className="cursor-pointer">
                  <Printer className="w-4 h-4 mr-2" />
                  Pro tisk (vysoká kvalita)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" asChild>
            <Link href={`/admin/objednavky/${order.id}/upravit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Upravit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Položky objednávky</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Položka</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-center">Množství</TableHead>
                    <TableHead className="text-right">Cena/ks</TableHead>
                    <TableHead className="text-right">Celkem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Žádné položky
                      </TableCell>
                    </TableRow>
                  ) : (
                    order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {CATEGORY_LABELS[item.category]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(item.total_price)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {order.items.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mezisoučet</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      {order.discount_percent > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Sleva ({order.discount_percent}%)
                          </span>
                          <span className="text-green-600">
                            -{formatPrice(order.subtotal * (order.discount_percent / 100))}
                          </span>
                        </div>
                      )}
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sleva</span>
                          <span className="text-green-600">
                            -{formatPrice(order.discount_amount)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Celkem</span>
                        <span>{formatPrice(order.total_price)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment info */}
          <Card>
            <CardHeader>
              <CardTitle>Platební informace</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Záloha</p>
                  <p className="text-xl font-bold">{formatPrice(order.deposit_amount)}</p>
                  {order.deposit_paid_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Zaplaceno {format(new Date(order.deposit_paid_at), 'd. M. yyyy', { locale: cs })}
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Doplatek</p>
                  <p className="text-xl font-bold">
                    {formatPrice(order.total_price - order.deposit_amount)}
                  </p>
                  {order.final_payment_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Zaplaceno {format(new Date(order.final_payment_at), 'd. M. yyyy', { locale: cs })}
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Celkem k úhradě</p>
                  <p className="text-xl font-bold">{formatPrice(order.total_price)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Poznámky</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Internal notes */}
          {order.internal_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Interní poznámky</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{order.internal_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pool configuration */}
          {order.pool_config && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="w-5 h-5" />
                  Konfigurace bazénu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const config = order.pool_config as PoolConfig
                  return (
                    <div className="space-y-3 text-sm">
                      {config.shape && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tvar</span>
                          <span className="font-medium">{getShapeLabel(config.shape)}</span>
                        </div>
                      )}
                      {config.type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Typ</span>
                          <span className="font-medium">{getTypeLabel(config.type)}</span>
                        </div>
                      )}
                      {config.dimensions && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rozměry</span>
                          <span className="font-medium">
                            {formatDimensions(config.shape || '', config.dimensions)}
                          </span>
                        </div>
                      )}
                      {config.color && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Barva</span>
                          <span className="font-medium">{getColorLabel(config.color)}</span>
                        </div>
                      )}
                      {config.stairs && config.stairs !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Schodiště</span>
                          <span className="font-medium">{getStairsLabel(config.stairs)}</span>
                        </div>
                      )}
                      {config.technology && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Technologie</span>
                          <span className="font-medium text-right">
                            {Array.isArray(config.technology)
                              ? config.technology.map(t => getTechnologyLabel(t)).join(', ')
                              : getTechnologyLabel(config.technology)}
                          </span>
                        </div>
                      )}
                      {config.heating && config.heating !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ohřev</span>
                          <span className="font-medium">{getHeatingLabel(config.heating)}</span>
                        </div>
                      )}
                      {config.roofing && config.roofing !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zastřešení</span>
                          <span className="font-medium">{getRoofingLabel(config.roofing)}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Zákazník</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                </div>
              </div>
              {order.customer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a href={`mailto:${order.customer_email}`} className="hover:underline">
                      {order.customer_email}
                    </a>
                  </div>
                </div>
              )}
              {order.customer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a href={`tel:${order.customer_phone}`} className="hover:underline">
                      {order.customer_phone}
                    </a>
                  </div>
                </div>
              )}
              {order.customer_address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {order.customer_address}
                    </a>
                  </div>
                </div>
              )}
              {(order.customer_ico || order.customer_dic) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {order.customer_ico && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">IČO</p>
                          <p className="font-medium">{order.customer_ico}</p>
                        </div>
                      </div>
                    )}
                    {order.customer_dic && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">DIČ</p>
                          <p className="font-medium">{order.customer_dic}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Termíny</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.contract_date && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Podpis smlouvy</p>
                    <p className="font-medium">
                      {format(new Date(order.contract_date), 'd. MMMM yyyy', { locale: cs })}
                    </p>
                  </div>
                </div>
              )}
              {order.delivery_date && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plánované dodání</p>
                    <p className="font-medium">
                      {format(new Date(order.delivery_date), 'd. MMMM yyyy', { locale: cs })}
                    </p>
                  </div>
                </div>
              )}
              {order.delivery_address && order.delivery_address !== order.customer_address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresa dodání</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline hover:text-primary transition-colors"
                    >
                      {order.delivery_address}
                    </a>
                  </div>
                </div>
              )}
              {!order.contract_date && !order.delivery_date && (
                <p className="text-muted-foreground text-sm">Termíny ještě nebyly stanoveny</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
