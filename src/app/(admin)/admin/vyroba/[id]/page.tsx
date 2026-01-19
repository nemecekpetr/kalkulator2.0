import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// Simplified production order view - just preview and PDF download
import {
  ArrowLeft,
  FileDown,
  Package,
  User,
  MapPin,
  ExternalLink,
  Pencil,
  ChevronDown,
  Mail,
  Printer,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PoolSchematic } from '@/components/pool-schematic'
import { DeleteProductionButton } from '@/components/admin/delete-production-button'
import { ProductionStatusBadge } from '@/components/admin/production-status-badge'
import type { ProductionOrder, ProductionOrderItem } from '@/lib/supabase/types'

interface PoolConfig {
  shape?: string
  type?: string
  dimensions?: {
    diameter?: number
    width?: number
    length?: number
    depth?: number
  }
  color?: string
  stairs?: string
  lighting?: string
  counterflow?: string
  technology?: string[]
  accessories?: string[]
}

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getProductionOrder(id: string) {
  const supabase = await createAdminClient()

  const { data: productionOrder, error } = await supabase
    .from('production_orders')
    .select('*, production_order_items(*), orders(order_number, customer_name, delivery_address, customer_address, pool_config)')
    .eq('id', id)
    .single()

  if (error || !productionOrder) {
    return null
  }

  return productionOrder as ProductionOrder & {
    production_order_items: ProductionOrderItem[]
    orders?: {
      order_number: string
      customer_name: string
      customer_address: string | null
      delivery_address: string | null
      pool_config: PoolConfig | null
    } | null
  }
}

const POOL_SHAPE_LABELS: Record<string, string> = {
  circle: 'Kruhový',
  rectangle_rounded: 'Obdélník zaoblený',
  rectangle_sharp: 'Obdélník ostrý',
}

const POOL_TYPE_LABELS: Record<string, string> = {
  skimmer: 'Skimmer',
  overflow: 'Přelivový',
}

const POOL_COLOR_LABELS: Record<string, string> = {
  blue: 'Modrá',
  white: 'Bílá',
  gray: 'Šedá',
  combination: 'Kombinace',
}

// Category labels for material list
const CATEGORY_LABELS: Record<string, string> = {
  bazeny: 'Bazén',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
  doprava: 'Doprava',
}

export default async function ProductionDetailPage({ params }: PageProps) {
  const { id } = await params
  const productionOrder = await getProductionOrder(id)

  if (!productionOrder) {
    notFound()
  }

  const items = productionOrder.production_order_items || []

  // Extract pool config for schematic
  const poolConfig = productionOrder.orders?.pool_config
  const hasLighting = !!(poolConfig?.lighting && poolConfig.lighting !== 'none')
  const hasCounterflow = !!(poolConfig?.counterflow && poolConfig.counterflow !== 'none')

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'ostatni'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof items>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/vyroba">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{productionOrder.production_number}</h1>
              <ProductionStatusBadge
                productionOrderId={productionOrder.id}
                currentStatus={productionOrder.status}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Vytvořeno {format(new Date(productionOrder.created_at), 'd. MMMM yyyy', { locale: cs })}
              {productionOrder.orders && (
                <>
                  {' · '}
                  <Link
                    href={`/admin/objednavky/${productionOrder.order_id}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {productionOrder.orders.order_number}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DeleteProductionButton
            productionId={productionOrder.id}
            productionNumber={productionOrder.production_number}
          />
          <Button variant="outline" size="lg" asChild>
            <Link href={`/admin/vyroba/${productionOrder.id}/upravit`}>
              <Pencil className="w-5 h-5 mr-2" />
              Upravit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg">
                <FileDown className="w-5 h-5 mr-2" />
                Stáhnout PDF
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/api/admin/production/${productionOrder.id}/pdf`} download className="cursor-pointer">
                  <Mail className="w-4 h-4 mr-2" />
                  Pro email (menší soubor)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/admin/production/${productionOrder.id}/pdf?quality=print`} download className="cursor-pointer">
                  <Printer className="w-4 h-4 mr-2" />
                  Pro tisk (vysoká kvalita)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content preview - mirrors what's in the PDF */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle>Náhled výrobního zadání</CardTitle>
            <Badge variant="outline">
              {items.length} položek
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Two column layout for desktop */}
          <div className="grid gap-8 lg:grid-cols-2">

            {/* Left: Pool schematic and specs */}
            <div className="space-y-6">
              {/* Pool schematic */}
              <div className="flex justify-center bg-slate-50 rounded-lg p-6">
                <PoolSchematic
                  shape={productionOrder.pool_shape}
                  type={productionOrder.pool_type}
                  dimensions={productionOrder.pool_dimensions}
                  depth={productionOrder.pool_depth}
                  color={productionOrder.pool_color}
                  stairs={poolConfig?.stairs}
                  hasLighting={hasLighting}
                  hasCounterflow={hasCounterflow}
                  scale={1.3}
                />
              </div>

              {/* Pool specs */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {productionOrder.pool_shape && (
                  <div>
                    <p className="text-muted-foreground">Tvar</p>
                    <p className="font-medium">{POOL_SHAPE_LABELS[productionOrder.pool_shape] || productionOrder.pool_shape}</p>
                  </div>
                )}
                {productionOrder.pool_type && (
                  <div>
                    <p className="text-muted-foreground">Typ</p>
                    <p className="font-medium">{POOL_TYPE_LABELS[productionOrder.pool_type] || productionOrder.pool_type}</p>
                  </div>
                )}
                {productionOrder.pool_dimensions && (
                  <div>
                    <p className="text-muted-foreground">Rozměry</p>
                    <p className="font-medium font-mono">{productionOrder.pool_dimensions}</p>
                  </div>
                )}
                {productionOrder.pool_depth && (
                  <div>
                    <p className="text-muted-foreground">Hloubka</p>
                    <p className="font-medium font-mono">{productionOrder.pool_depth}</p>
                  </div>
                )}
                {productionOrder.pool_color && (
                  <div>
                    <p className="text-muted-foreground">Barva</p>
                    <p className="font-medium">{POOL_COLOR_LABELS[productionOrder.pool_color] || productionOrder.pool_color}</p>
                  </div>
                )}
                {poolConfig?.stairs && poolConfig.stairs !== 'none' && (
                  <div>
                    <p className="text-muted-foreground">Schody</p>
                    <p className="font-medium">{poolConfig.stairs}</p>
                  </div>
                )}
              </div>

              {/* Customer & delivery info */}
              {productionOrder.orders && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{productionOrder.orders.customer_name}</p>
                    </div>
                  </div>
                  {(productionOrder.orders.delivery_address || productionOrder.orders.customer_address) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{productionOrder.orders.delivery_address || productionOrder.orders.customer_address}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {productionOrder.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Poznámky</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="whitespace-pre-wrap text-sm">{productionOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Material list */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Materiálový kusovník
              </h3>

              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="mb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  <div className="space-y-1">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start py-1.5 border-b border-dashed last:border-0"
                      >
                        <div className="flex-1">
                          <p className="text-sm">{item.material_name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right font-mono text-sm whitespace-nowrap ml-4">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Žádné položky
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
