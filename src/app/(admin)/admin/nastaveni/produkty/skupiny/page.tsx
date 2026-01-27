import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Package, ArrowLeft } from 'lucide-react'
import type { ProductGroupWithItems } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Skupiny produktů | Rentmil Admin',
}

async function getProductGroups(): Promise<ProductGroupWithItems[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('product_groups')
    .select(`
      *,
      items:product_group_items(
        *,
        product:products(id, name, unit_price)
      )
    `)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching product groups:', error)
    return []
  }

  return data as ProductGroupWithItems[]
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

function calculateGroupTotal(group: ProductGroupWithItems): number {
  return (group.items || []).reduce((sum, item) => {
    const price = item.product?.unit_price || 0
    return sum + price * item.quantity
  }, 0)
}

const CATEGORY_LABELS: Record<string, string> = {
  zaklad: 'Základní balíčky',
  technologie: 'Technologie',
  prislusenstvi: 'Příslušenství',
  servis: 'Servis',
  jine: 'Jiné',
}

export default async function ProductGroupsPage() {
  const groups = await getProductGroups()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/nastaveni/produkty">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zpět
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6" />
            Skupiny produktů
          </h1>
          <p className="text-muted-foreground">
            Balíčky produktů pro rychlé vkládání do nabídek
          </p>
        </div>
        <Link href="/admin/nastaveni/produkty/skupiny/nova">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nová skupina
          </Button>
        </Link>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Žádné skupiny produktů</p>
              <p className="text-sm mb-4">
                Vytvořte první skupinu pro rychlejší práci s nabídkami
              </p>
              <Link href="/admin/nastaveni/produkty/skupiny/nova">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Vytvořit skupinu
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Seznam skupin</CardTitle>
            <CardDescription>
              Celkem {groups.length} skupin produktů
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-center">Produktů</TableHead>
                  <TableHead className="text-right">Celková cena</TableHead>
                  <TableHead>Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        href={`/admin/nastaveni/produkty/skupiny/${group.id}`}
                        className="block"
                      >
                        <div className="font-medium">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {group.description}
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {group.category ? (
                        <Badge variant="secondary">
                          {CATEGORY_LABELS[group.category] || group.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {group.items?.length || 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(calculateGroupTotal(group))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.active ? 'default' : 'secondary'}>
                        {group.active ? 'Aktivní' : 'Neaktivní'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
