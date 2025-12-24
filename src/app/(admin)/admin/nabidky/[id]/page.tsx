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
  Pencil,
  FileDown,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react'
import { QuoteVersions } from '@/components/admin/quote-versions'
import type { Quote, QuoteItem, QuoteItemCategory } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
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

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  return {
    ...quote,
    items: items || [],
  } as Quote & { items: QuoteItem[] }
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
            <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
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
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Položky nabídky</CardTitle>
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
            </CardContent>
          </Card>

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
                    <p>{quote.customer_address}</p>
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
