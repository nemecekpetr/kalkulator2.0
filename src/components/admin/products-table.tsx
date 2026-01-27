'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Search,
  Waves,
  Wrench,
  Settings,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Trash2,
  Home,
  Footprints,
  Droplets,
  Wind,
  Cpu,
  Package,
  Flame,
  Lightbulb,
  Sparkles,
  FlaskConical,
  MoreHorizontal,
  Layers,
  Percent,
  Calculator,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductCategory, PriceType } from '@/lib/supabase/types'
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_COLORS } from '@/lib/constants/categories'

interface ProductsTableProps {
  products: Product[]
}

// Icons for each category (kept local as these are UI-specific)
const CATEGORY_ICONS: Record<ProductCategory, typeof Waves> = {
  bazeny: Waves,
  zastreseni: Home,
  sluzby: Wrench,
  doprava: Truck,
  prislusenstvi: Settings,
  schodiste: Footprints,
  uprava_vody: Droplets,
  protiproud: Wind,
  technologie: Cpu,
  material: Package,
  ohrev: Flame,
  osvetleni: Lightbulb,
  cisteni: Sparkles,
  chemie: FlaskConical,
  jine: MoreHorizontal,
  sety: Layers,
}

// Price type labels and icons
const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Fixní',
  percentage: '%',
  surface_coefficient: 'm²',
}

const PRICE_TYPE_ICONS: Record<PriceType, typeof Waves> = {
  fixed: Package,
  percentage: Percent,
  surface_coefficient: Calculator,
}

type SortField = 'name' | 'code' | 'category' | 'unit_price' | 'active'
type SortDirection = 'asc' | 'desc'

export function ProductsTable({ products }: ProductsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    )
  }

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.code?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        categoryFilter === 'all' || product.category === categoryFilter

      return matchesSearch && matchesCategory
    })

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'cs')
          break
        case 'code':
          comparison = (a.code || '').localeCompare(b.code || '', 'cs')
          break
        case 'category':
          comparison = PRODUCT_CATEGORY_LABELS[a.category].localeCompare(
            PRODUCT_CATEGORY_LABELS[b.category],
            'cs'
          )
          break
        case 'unit_price':
          comparison = a.unit_price - b.unit_price
          break
        case 'active':
          comparison = (a.active ? 1 : 0) - (b.active ? 1 : 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [products, search, categoryFilter, sortField, sortDirection])

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedProducts.map((p) => p.id)))
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

  // Bulk actions
  const handleBulkCategoryChange = async (newCategory: ProductCategory) => {
    if (selectedIds.size === 0) return

    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { category: newCategory },
        }),
      })

      if (response.ok) {
        toast.success('Kategorie změněna')
        setSelectedIds(new Set())
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Chyba při hromadné úpravě')
      }
    } catch (err) {
      console.error('Bulk update error:', err)
      toast.error('Chyba připojení')
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleBulkActiveChange = async (active: boolean) => {
    if (selectedIds.size === 0) return

    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { active },
        }),
      })

      if (response.ok) {
        toast.success(active ? 'Produkty aktivovány' : 'Produkty deaktivovány')
        setSelectedIds(new Set())
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Chyba při hromadné úpravě')
      }
    } catch (err) {
      console.error('Bulk update error:', err)
      toast.error('Chyba připojení')
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setBulkUpdating(true)
    try {
      const response = await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
        }),
      })

      if (response.ok) {
        toast.success('Produkty smazány')
        setSelectedIds(new Set())
        setDeleteDialogOpen(false)
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Chyba při mazání produktů')
      }
    } catch (err) {
      console.error('Bulk delete error:', err)
      toast.error('Chyba připojení')
    } finally {
      setBulkUpdating(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const isAllSelected =
    filteredAndSortedProducts.length > 0 &&
    selectedIds.size === filteredAndSortedProducts.length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat produkty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((category) => (
              <SelectItem key={category} value={category}>
                {PRODUCT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            Vybráno: {selectedIds.size} produktů
          </span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkUpdating}>
                  {bulkUpdating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Změnit kategorii
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => handleBulkCategoryChange(category)}
                  >
                    {PRODUCT_CATEGORY_LABELS[category]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkUpdating}>
                  Změnit stav
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkActiveChange(true)}>
                  Aktivovat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkActiveChange(false)}>
                  Deaktivovat
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
              onClick={() => setDeleteDialogOpen(true)}
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
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Název
                  {getSortIcon('name')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('code')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Kód
                  {getSortIcon('code')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Kategorie
                  {getSortIcon('category')}
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  onClick={() => handleSort('unit_price')}
                  className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                >
                  Cena
                  {getSortIcon('unit_price')}
                </button>
              </TableHead>
              <TableHead>Jednotka</TableHead>
              <TableHead>Typ ceny</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('active')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Stav
                  {getSortIcon('active')}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {search || categoryFilter !== 'all'
                    ? 'Žádné produkty nenalezeny'
                    : 'Žádné produkty. Vytvořte nový nebo synchronizujte z Pipedrive.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProducts.map((product) => {
                const CategoryIcon = CATEGORY_ICONS[product.category]
                const priceType = product.price_type || 'fixed'
                const PriceTypeIcon = PRICE_TYPE_ICONS[priceType]

                return (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/produkty/${product.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">
                        {product.code || '-'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={PRODUCT_CATEGORY_COLORS[product.category]}>
                        {PRODUCT_CATEGORY_LABELS[product.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {priceType === 'fixed' ? (
                        formatPrice(product.unit_price)
                      ) : priceType === 'percentage' ? (
                        <span className="text-muted-foreground">
                          {product.price_percentage}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {product.price_coefficient} Kč/m²
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PriceTypeIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {PRICE_TYPE_LABELS[priceType]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Aktivní' : 'Neaktivní'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Zobrazeno {filteredAndSortedProducts.length} z {products.length} produktů
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat produkty</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat {selectedIds.size} produktů? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
