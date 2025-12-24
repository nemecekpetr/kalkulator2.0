'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Package, Wrench, Settings } from 'lucide-react'
import type { Product, ProductCategory } from '@/lib/supabase/types'

interface ProductsTableProps {
  products: Product[]
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bazeny: 'Bazény',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
}

const CATEGORY_ICONS: Record<ProductCategory, typeof Package> = {
  bazeny: Package,
  prislusenstvi: Settings,
  sluzby: Wrench,
}

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  bazeny: 'bg-blue-100 text-blue-800',
  prislusenstvi: 'bg-purple-100 text-purple-800',
  sluzby: 'bg-orange-100 text-orange-800',
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.code?.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      categoryFilter === 'all' || product.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

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
            <SelectItem value="bazeny">Bazény</SelectItem>
            <SelectItem value="prislusenstvi">Příslušenství</SelectItem>
            <SelectItem value="sluzby">Služby</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Kód</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead className="text-right">Cena</TableHead>
              <TableHead>Jednotka</TableHead>
              <TableHead>Stav</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search || categoryFilter !== 'all'
                    ? 'Žádné produkty nenalezeny'
                    : 'Žádné produkty. Synchronizujte z Pipedrive.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const CategoryIcon = CATEGORY_ICONS[product.category]

                return (
                  <TableRow key={product.id}>
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
                      <Badge variant="secondary" className={CATEGORY_COLORS[product.category]}>
                        {CATEGORY_LABELS[product.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(product.unit_price)}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
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
        Zobrazeno {filteredProducts.length} z {products.length} produktů
      </p>
    </div>
  )
}
