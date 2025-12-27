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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/lib/supabase/types'

interface PoolMappingSectionProps {
  poolProducts: Product[]
}

// Parse product code to extract pool info
// Format: BAZ-{SHAPE}-{TYPE}-{DIMENSIONS}
// Examples: BAZ-OBD-SK-3-6-1.2, BAZ-KRU-PR-3-1.5
function parsePoolCode(code: string): {
  shape: 'circle' | 'rectangle' | null
  type: 'skimmer' | 'overflow' | null
  width?: number
  length?: number
  diameter?: number
  depth?: number
} | null {
  if (!code || !code.startsWith('BAZ-')) return null

  const parts = code.split('-')
  if (parts.length < 4) return null

  const shapeCode = parts[1]
  const typeCode = parts[2]

  const shape = shapeCode === 'KRU' ? 'circle' : shapeCode === 'OBD' ? 'rectangle' : null
  const type = typeCode === 'SK' ? 'skimmer' : typeCode === 'PR' ? 'overflow' : null

  if (!shape || !type) return null

  if (shape === 'circle') {
    // BAZ-KRU-SK-3-1.5 -> diameter=3, depth=1.5
    const diameter = parseFloat(parts[3])
    const depth = parseFloat(parts[4])
    return { shape, type, diameter, depth }
  } else {
    // BAZ-OBD-SK-3-6-1.2 -> width=3, length=6, depth=1.2
    const width = parseFloat(parts[3])
    const length = parseFloat(parts[4])
    const depth = parseFloat(parts[5])
    return { shape, type, width, length, depth }
  }
}

type ParsedProduct = Product & {
  parsed: NonNullable<ReturnType<typeof parsePoolCode>>
}

export function PoolMappingSection({ poolProducts }: PoolMappingSectionProps) {
  const router = useRouter()

  // Filter state - all empty by default
  const [filterShape, setFilterShape] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterWidth, setFilterWidth] = useState<string>('')
  const [filterLength, setFilterLength] = useState<string>('')
  const [filterDiameter, setFilterDiameter] = useState<string>('')
  const [filterDepth, setFilterDepth] = useState<string>('')

  // Edit dialog state
  const [editingProduct, setEditingProduct] = useState<ParsedProduct | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [saving, setSaving] = useState(false)

  // Parse all pool products
  const parsedProducts = useMemo(() => {
    return poolProducts
      .map(product => ({
        ...product,
        parsed: parsePoolCode(product.code || ''),
      }))
      .filter((p): p is ParsedProduct => p.parsed !== null)
      .sort((a, b) => {
        // Sort by shape, then type, then dimensions
        if (a.parsed.shape !== b.parsed.shape) {
          return a.parsed.shape === 'circle' ? -1 : 1
        }
        if (a.parsed.type !== b.parsed.type) {
          return a.parsed.type === 'skimmer' ? -1 : 1
        }
        return (a.parsed.depth || 0) - (b.parsed.depth || 0)
      })
  }, [poolProducts])

  // Filtered products based on all filters
  const filteredProducts = useMemo(() => {
    return parsedProducts.filter(p => {
      // Shape filter
      if (filterShape !== 'all' && p.parsed.shape !== filterShape) return false

      // Type filter
      if (filterType !== 'all' && p.parsed.type !== filterType) return false

      // Dimension filters
      if (filterDepth && p.parsed.depth !== parseFloat(filterDepth)) return false

      if (p.parsed.shape === 'circle') {
        if (filterDiameter && p.parsed.diameter !== parseFloat(filterDiameter)) return false
      } else {
        if (filterWidth && p.parsed.width !== parseFloat(filterWidth)) return false
        if (filterLength && p.parsed.length !== parseFloat(filterLength)) return false
      }

      return true
    })
  }, [parsedProducts, filterShape, filterType, filterWidth, filterLength, filterDiameter, filterDepth])

  // Stats
  const stats = useMemo(() => {
    const circles = parsedProducts.filter(p => p.parsed.shape === 'circle')
    const rectangles = parsedProducts.filter(p => p.parsed.shape === 'rectangle')
    const skimmers = parsedProducts.filter(p => p.parsed.type === 'skimmer')
    const overflows = parsedProducts.filter(p => p.parsed.type === 'overflow')

    return {
      total: parsedProducts.length,
      circles: circles.length,
      rectangles: rectangles.length,
      skimmers: skimmers.length,
      overflows: overflows.length,
    }
  }, [parsedProducts])

  // Get unique values for dimension filters
  const uniqueDimensions = useMemo(() => {
    const depths = new Set<number>()
    const diameters = new Set<number>()
    const widths = new Set<number>()
    const lengths = new Set<number>()

    parsedProducts.forEach(p => {
      if (p.parsed.depth) depths.add(p.parsed.depth)
      if (p.parsed.diameter) diameters.add(p.parsed.diameter)
      if (p.parsed.width) widths.add(p.parsed.width)
      if (p.parsed.length) lengths.add(p.parsed.length)
    })

    return {
      depths: Array.from(depths).sort((a, b) => a - b),
      diameters: Array.from(diameters).sort((a, b) => a - b),
      widths: Array.from(widths).sort((a, b) => a - b),
      lengths: Array.from(lengths).sort((a, b) => a - b),
    }
  }, [parsedProducts])

  // Clear dimension filters when shape changes
  const handleShapeChange = (value: string) => {
    setFilterShape(value)
    setFilterWidth('')
    setFilterLength('')
    setFilterDiameter('')
  }

  // Clear all filters
  const clearFilters = () => {
    setFilterShape('all')
    setFilterType('all')
    setFilterWidth('')
    setFilterLength('')
    setFilterDiameter('')
    setFilterDepth('')
  }

  // Check if any filter is active
  const hasActiveFilters = filterShape !== 'all' || filterType !== 'all' ||
    filterWidth || filterLength || filterDiameter || filterDepth

  // Open edit dialog
  const openEditDialog = (product: ParsedProduct) => {
    setEditingProduct(product)
    setEditCode(product.code || '')
    setEditPrice(product.unit_price.toString())
  }

  // Close edit dialog
  const closeEditDialog = () => {
    setEditingProduct(null)
    setEditCode('')
    setEditPrice('')
  }

  // Save product changes
  const handleSave = async () => {
    if (!editingProduct) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/products/bulk-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [editingProduct.id],
          updates: {
            code: editCode,
            unit_price: parseFloat(editPrice),
          },
        }),
      })

      if (response.ok) {
        toast.success('Produkt byl aktualizován')
        closeEditDialog()
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Chyba při ukládání')
      }
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-muted rounded-lg text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Celkem bazénů</div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.circles}</div>
          <div className="text-sm text-blue-600">Kruhových</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-700">{stats.rectangles}</div>
          <div className="text-sm text-purple-600">Obdélníkových</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">{stats.skimmers}</div>
          <div className="text-sm text-green-600">Skimmerových</div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-700">{stats.overflows}</div>
          <div className="text-sm text-orange-600">Přelivových</div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-medium">Filtry</Label>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Vymazat filtry
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* Shape */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tvar</Label>
            <Select value={filterShape} onValueChange={handleShapeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Vše" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vše</SelectItem>
                <SelectItem value="circle">Kruhový</SelectItem>
                <SelectItem value="rectangle">Obdélníkový</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Typ</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Vše" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vše</SelectItem>
                <SelectItem value="skimmer">Skimmer</SelectItem>
                <SelectItem value="overflow">Přeliv</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional dimension fields */}
          {filterShape === 'circle' ? (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Průměr (m)</Label>
              <Select value={filterDiameter || '__all__'} onValueChange={(v) => setFilterDiameter(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vše" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Vše</SelectItem>
                  {uniqueDimensions.diameters.map(d => (
                    <SelectItem key={d} value={d.toString()}>{d} m</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : filterShape === 'rectangle' ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Šířka (m)</Label>
                <Select value={filterWidth || '__all__'} onValueChange={(v) => setFilterWidth(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vše" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Vše</SelectItem>
                    {uniqueDimensions.widths.map(w => (
                      <SelectItem key={w} value={w.toString()}>{w} m</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Délka (m)</Label>
                <Select value={filterLength || '__all__'} onValueChange={(v) => setFilterLength(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vše" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Vše</SelectItem>
                    {uniqueDimensions.lengths.map(l => (
                      <SelectItem key={l} value={l.toString()}>{l} m</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Rozměry</Label>
                <div className="text-sm text-muted-foreground pt-2">
                  Vyberte tvar pro filtrování rozměrů
                </div>
              </div>
            </>
          )}

          {/* Depth - always visible */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Hloubka (m)</Label>
            <Select value={filterDepth || '__all__'} onValueChange={(v) => setFilterDepth(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Vše" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Vše</SelectItem>
                {uniqueDimensions.depths.map(d => (
                  <SelectItem key={d} value={d.toString()}>{d} m</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {hasActiveFilters ? (
              <>Zobrazeno <strong>{filteredProducts.length}</strong> z {parsedProducts.length} bazénů</>
            ) : (
              <>Celkem <strong>{parsedProducts.length}</strong> bazénů</>
            )}
          </div>
        </div>
        <div className="max-h-[500px] overflow-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Kód produktu</TableHead>
                <TableHead>Tvar</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Rozměry</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? (
                      <>Žádný bazén neodpovídá zadaným filtrům</>
                    ) : (
                      <>Žádné bazény v systému</>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDialog(product)}
                  >
                    <TableCell className="font-mono text-sm">
                      {product.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.parsed.shape === 'circle' ? 'default' : 'secondary'}>
                        {product.parsed.shape === 'circle' ? 'Kruhový' : 'Obdélník'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.parsed.type === 'skimmer' ? 'Skimmer' : 'Přeliv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.parsed.shape === 'circle' ? (
                        <span>Ø{product.parsed.diameter} × {product.parsed.depth} m</span>
                      ) : (
                        <span>{product.parsed.width} × {product.parsed.length} × {product.parsed.depth} m</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(product.unit_price)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => closeEditDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upravit bazén</DialogTitle>
            <DialogDescription>
              {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Kód produktu</Label>
              <Input
                id="code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="font-mono"
                placeholder="BAZ-OBD-SK-3-6-1.2"
              />
              <p className="text-xs text-muted-foreground">
                Formát: BAZ-[KRU/OBD]-[SK/PR]-rozměry
              </p>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Cena (Kč)</Label>
              <Input
                id="price"
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>

            {/* Preview of parsed code */}
            {editCode && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground mb-1">Parsovaný kód:</p>
                {(() => {
                  const parsed = parsePoolCode(editCode)
                  if (!parsed) return <p className="text-red-600">Neplatný formát kódu</p>
                  return (
                    <div className="space-y-1">
                      <p>Tvar: <strong>{parsed.shape === 'circle' ? 'Kruhový' : 'Obdélníkový'}</strong></p>
                      <p>Typ: <strong>{parsed.type === 'skimmer' ? 'Skimmer' : 'Přeliv'}</strong></p>
                      {parsed.shape === 'circle' ? (
                        <p>Rozměry: <strong>Ø{parsed.diameter} × {parsed.depth} m</strong></p>
                      ) : (
                        <p>Rozměry: <strong>{parsed.width} × {parsed.length} × {parsed.depth} m</strong></p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving || !editCode || !editPrice}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
