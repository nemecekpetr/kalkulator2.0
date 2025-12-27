import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Pencil,
  FileDown,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Waves,
  Check,
  X,
} from 'lucide-react'
import { QuoteVersions } from '@/components/admin/quote-versions'
import { QuoteStatusBadge } from '@/components/admin/quote-status-badge'
import type { Quote, QuoteItem, QuoteItemCategory, PoolDimensions, QuoteVariant, QuoteVariantKey, QuoteStatus } from '@/lib/supabase/types'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getLightingLabel,
  getCounterflowLabel,
  getWaterTreatmentLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'

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
  accessories?: string[]
  lighting?: string
  counterflow?: string
  waterTreatment?: string
  heating?: string
  roofing?: string
}

interface QuoteItemWithVariants extends QuoteItem {
  variant_ids: string[]
}

const CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazény',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
  prace: 'Práce',
  doprava: 'Doprava',
  jine: 'Jiné',
}

async function getQuote(id: string) {
  const supabase = await createAdminClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !quote) {
    return null
  }

  // Fetch items
  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  // Fetch variants
  const { data: variants } = await supabase
    .from('quote_variants')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  // Fetch existing order for this quote
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('quote_id', id)
    .single()

  // Fetch item-variant associations
  const itemIds = (items || []).map((i) => i.id)
  let associations: { quote_item_id: string; quote_variant_id: string }[] = []

  if (itemIds.length > 0) {
    const { data: assocData } = await supabase
      .from('quote_item_variants')
      .select('quote_item_id, quote_variant_id')
      .in('quote_item_id', itemIds)
    associations = assocData || []
  }

  // Add variant_ids to items
  const itemsWithVariants = (items || []).map((item) => ({
    ...item,
    variant_ids: associations
      .filter((a) => a.quote_item_id === item.id)
      .map((a) => a.quote_variant_id),
  }))

  return {
    ...quote,
    items: itemsWithVariants,
    variants: variants || [],
    existingOrder: existingOrder || null,
  } as Quote & { items: QuoteItemWithVariants[]; variants: QuoteVariant[]; existingOrder: { id: string; order_number: string } | null }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params
  const quote = await getQuote(id)

  if (!quote) {
    notFound()
  }

  const hasVariants = quote.variants && quote.variants.length > 0

  // Get items for a specific variant
  const getVariantItems = (variantId: string) => {
    return quote.items.filter((item) => item.variant_ids.includes(variantId))
  }

  // Get all unique items across all variants
  const allUniqueItems = quote.items

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/nabidky">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
              <QuoteStatusBadge
                quoteId={quote.id}
                status={(quote.status as QuoteStatus) || 'draft'}
                validUntil={quote.valid_until}
                existingOrder={quote.existingOrder}
              />
            </div>
            <p className="text-muted-foreground">
              Vytvořeno {format(new Date(quote.created_at), 'd. MMMM yyyy', { locale: cs })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/admin/quotes/${quote.id}/pdf`} download>
              <FileDown className="w-4 h-4 mr-2" />
              Stáhnout PDF
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/nabidky/${quote.id}/upravit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Upravit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Variants comparison summary (if has variants) */}
          {hasVariants && (
            <Card>
              <CardHeader>
                <CardTitle>Přehled variant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {quote.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="p-4 rounded-lg border bg-muted/30 text-center"
                    >
                      <h3 className="font-semibold text-lg">{variant.variant_name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {getVariantItems(variant.id).length} položek
                      </p>
                      <p className="text-2xl font-bold">{formatPrice(variant.total_price)}</p>
                      {(variant.discount_percent > 0 || variant.discount_amount > 0) && (
                        <p className="text-sm text-green-600 mt-1">
                          Sleva: {variant.discount_percent > 0 && `${variant.discount_percent}%`}
                          {variant.discount_percent > 0 && variant.discount_amount > 0 && ' + '}
                          {variant.discount_amount > 0 && formatPrice(variant.discount_amount)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items - with tabs if variants exist */}
          <Card>
            <CardHeader>
              <CardTitle>Položky nabídky</CardTitle>
            </CardHeader>
            <CardContent>
              {hasVariants ? (
                <Tabs defaultValue={quote.variants[0]?.id}>
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${quote.variants.length}, 1fr)` }}>
                    {quote.variants.map((variant) => (
                      <TabsTrigger key={variant.id} value={variant.id}>
                        {variant.variant_name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {quote.variants.map((variant) => {
                    const variantItems = getVariantItems(variant.id)
                    return (
                      <TabsContent key={variant.id} value={variant.id}>
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
                            {variantItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                  Žádné položky
                                </TableCell>
                              </TableRow>
                            ) : (
                              variantItems.map((item) => (
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

                        {variantItems.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <div className="flex justify-end">
                              <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Mezisoučet</span>
                                  <span>{formatPrice(variant.subtotal)}</span>
                                </div>
                                {variant.discount_percent > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      Sleva ({variant.discount_percent}%)
                                    </span>
                                    <span className="text-green-600">
                                      -{formatPrice(variant.subtotal * (variant.discount_percent / 100))}
                                    </span>
                                  </div>
                                )}
                                {variant.discount_amount > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Sleva</span>
                                    <span className="text-green-600">
                                      -{formatPrice(variant.discount_amount)}
                                    </span>
                                  </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-semibold text-lg">
                                  <span>Celkem</span>
                                  <span>{formatPrice(variant.total_price)}</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>
              ) : (
                // Legacy display without variants
                <>
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
                      {quote.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Žádné položky
                          </TableCell>
                        </TableRow>
                      ) : (
                        quote.items.map((item) => (
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

                  {quote.items.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Mezisoučet</span>
                            <span>{formatPrice(quote.subtotal)}</span>
                          </div>
                          {quote.discount_percent > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Sleva ({quote.discount_percent}%)
                              </span>
                              <span className="text-green-600">
                                -{formatPrice(quote.subtotal * (quote.discount_percent / 100))}
                              </span>
                            </div>
                          )}
                          {quote.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Sleva</span>
                              <span className="text-green-600">
                                -{formatPrice(quote.discount_amount)}
                              </span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-semibold text-lg">
                            <span>Celkem</span>
                            <span>{formatPrice(quote.total_price)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Comparison table (if has variants) */}
          {hasVariants && allUniqueItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Porovnání variant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Položka</TableHead>
                        {quote.variants.map((variant) => (
                          <TableHead key={variant.id} className="text-center min-w-[120px]">
                            {variant.variant_name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUniqueItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          {quote.variants.map((variant) => (
                            <TableCell key={variant.id} className="text-center">
                              {item.variant_ids.includes(variant.id) ? (
                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Celkem</TableCell>
                        {quote.variants.map((variant) => (
                          <TableCell key={variant.id} className="text-center">
                            {formatPrice(variant.total_price)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Poznámky</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Versions */}
          <QuoteVersions quoteId={quote.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pool configuration */}
          {quote.pool_config && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="w-5 h-5" />
                  Konfigurace bazénu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const config = quote.pool_config as PoolConfig
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
                      {config.accessories && config.accessories.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Příslušenství</span>
                          <span className="font-medium text-right">
                            {config.accessories
                              .filter(a => a !== 'none')
                              .map(a => {
                                if (a === 'led') return getLightingLabel(a)
                                if (a === 'with_counterflow') return getCounterflowLabel(a)
                                if (a === 'chlorine' || a === 'salt') return getWaterTreatmentLabel(a)
                                return a
                              })
                              .join(', ') || '-'}
                          </span>
                        </div>
                      )}
                      {config.lighting && config.lighting !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Osvětlení</span>
                          <span className="font-medium">{getLightingLabel(config.lighting)}</span>
                        </div>
                      )}
                      {config.counterflow && config.counterflow !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Protiproud</span>
                          <span className="font-medium">{getCounterflowLabel(config.counterflow)}</span>
                        </div>
                      )}
                      {config.waterTreatment && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Úprava vody</span>
                          <span className="font-medium">{getWaterTreatmentLabel(config.waterTreatment)}</span>
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
                  <p className="font-medium">{quote.customer_name}</p>
                </div>
              </div>
              {quote.customer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a href={`mailto:${quote.customer_email}`} className="hover:underline">
                      {quote.customer_email}
                    </a>
                  </div>
                </div>
              )}
              {quote.customer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a href={`tel:${quote.customer_phone}`} className="hover:underline">
                      {quote.customer_phone}
                    </a>
                  </div>
                </div>
              )}
              {quote.customer_address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.customer_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {quote.customer_address}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validity */}
          {quote.valid_until && (
            <Card>
              <CardHeader>
                <CardTitle>Platnost nabídky</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {format(new Date(quote.valid_until), 'd. MMMM yyyy', { locale: cs })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quote.valid_until) > new Date()
                        ? 'Nabídka je platná'
                        : 'Nabídka vypršela'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
