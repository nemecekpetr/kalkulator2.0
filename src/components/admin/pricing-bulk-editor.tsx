'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Search,
  Percent,
  DollarSign,
  FileUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/supabase/types'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/constants/categories'

interface PricingBulkEditorProps {
  products: Product[]
}

type ChangeType = 'percentage' | 'fixed'

interface PriceChange {
  productId: string
  productName: string
  oldPrice: number
  newPrice: number
  change: number
  changePercentage: number
}

interface CSVRow {
  code: string
  price: number
  found: boolean
  productId?: string
  productName?: string
  oldPrice?: number
}

// Build categories from imported labels
const CATEGORIES = [
  { value: 'all', label: 'Všechny kategorie' },
  ...Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
]

export function PricingBulkEditor({ products }: PricingBulkEditorProps) {
  const router = useRouter()

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Change values
  const [changeType, setChangeType] = useState<ChangeType>('percentage')
  const [changeValue, setChangeValue] = useState('')
  const [reason, setReason] = useState('')

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewChanges, setPreviewChanges] = useState<PriceChange[]>([])
  const [loading, setLoading] = useState(false)

  // CSV import
  const [csvText, setCsvText] = useState('')
  const [csvRows, setCsvRows] = useState<CSVRow[]>([])
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false)

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (category !== 'all' && p.category !== category) return false

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          p.name.toLowerCase().includes(searchLower) ||
          p.code?.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [products, category, search])

  // Select all / none
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Calculate preview
  const handlePreview = () => {
    if (selectedIds.size === 0) {
      toast.error('Vyberte alespoň jeden produkt')
      return
    }

    const value = parseFloat(changeValue)
    if (isNaN(value) || value === 0) {
      toast.error('Zadejte platnou hodnotu změny')
      return
    }

    const changes: PriceChange[] = []
    const selectedProducts = products.filter((p) => selectedIds.has(p.id))

    for (const product of selectedProducts) {
      let newPrice: number
      let change: number

      if (changeType === 'percentage') {
        change = product.unit_price * (value / 100)
        newPrice = product.unit_price + change
      } else {
        change = value
        newPrice = product.unit_price + value
      }

      // Round to whole numbers
      newPrice = Math.round(newPrice)
      change = Math.round(change)

      const changePercentage = (change / product.unit_price) * 100

      changes.push({
        productId: product.id,
        productName: product.name,
        oldPrice: product.unit_price,
        newPrice,
        change,
        changePercentage,
      })
    }

    setPreviewChanges(changes)
    setPreviewOpen(true)
  }

  // Apply changes
  const handleApply = async () => {
    setLoading(true)

    try {
      const value = parseFloat(changeValue)
      const response = await fetch('/api/admin/products/bulk-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          update_type: changeType,
          percentage_change: changeType === 'percentage' ? value : undefined,
          fixed_change: changeType === 'fixed' ? value : undefined,
          reason: reason || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Chyba při ukládání')
      }

      toast.success(`Ceny aktualizovány pro ${data.updated} produktů`)
      setPreviewOpen(false)
      setSelectedIds(new Set())
      setChangeValue('')
      setReason('')
      router.refresh()
    } catch (error) {
      console.error('Bulk price update error:', error)
      toast.error(error instanceof Error ? error.message : 'Chyba při ukládání')
    } finally {
      setLoading(false)
    }
  }

  // Parse CSV
  const parseCSV = () => {
    if (!csvText.trim()) {
      toast.error('Vložte CSV data')
      return
    }

    const lines = csvText.trim().split('\n')
    const rows: CSVRow[] = []

    for (const line of lines) {
      // Skip header
      if (line.toLowerCase().includes('kod') || line.toLowerCase().includes('cena')) {
        continue
      }

      // Split by common delimiters
      const parts = line.split(/[;,\t]/).map((p) => p.trim())

      if (parts.length < 2) continue

      const code = parts[0]
      const price = parseFloat(parts[1].replace(/\s/g, '').replace(',', '.'))

      if (!code || isNaN(price)) continue

      // Find matching product
      const product = products.find(
        (p) => p.code?.toLowerCase() === code.toLowerCase()
      )

      rows.push({
        code,
        price,
        found: !!product,
        productId: product?.id,
        productName: product?.name,
        oldPrice: product?.unit_price,
      })
    }

    if (rows.length === 0) {
      toast.error('Nepodařilo se parsovat žádné řádky')
      return
    }

    setCsvRows(rows)
    setCsvPreviewOpen(true)
  }

  // Apply CSV import
  const handleApplyCSV = async () => {
    const validRows = csvRows.filter((r) => r.found && r.productId)

    if (validRows.length === 0) {
      toast.error('Žádné produkty k aktualizaci')
      return
    }

    setLoading(true)

    try {
      // Update each product individually
      let updated = 0
      for (const row of validRows) {
        const response = await fetch(`/api/admin/products/${row.productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unit_price: row.price,
          }),
        })

        if (response.ok) {
          updated++
        }
      }

      toast.success(`Ceny aktualizovány pro ${updated} produktů`)
      setCsvPreviewOpen(false)
      setCsvText('')
      setCsvRows([])
      router.refresh()
    } catch (error) {
      console.error('CSV import error:', error)
      toast.error('Chyba při importu')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return sign + formatPrice(change)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bulk">Hromadná změna</TabsTrigger>
          <TabsTrigger value="csv">CSV import</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtry a výběr</CardTitle>
              <CardDescription>
                Filtrujte a vyberte produkty pro přeceňování
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search" className="sr-only">
                    Hledat
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Hledat produkty..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === filteredProducts.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm">
                    Vybrat vše ({filteredProducts.length})
                  </Label>
                </div>
                <Badge variant="secondary">
                  Vybráno: {selectedIds.size}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Products table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 sticky top-0 bg-background"></TableHead>
                      <TableHead className="sticky top-0 bg-background">Produkt</TableHead>
                      <TableHead className="sticky top-0 bg-background">Kategorie</TableHead>
                      <TableHead className="sticky top-0 bg-background text-right">
                        Cena
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer"
                        onClick={() => toggleSelect(product.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.code && (
                              <div className="text-sm text-muted-foreground">
                                {product.code}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {PRODUCT_CATEGORY_LABELS[product.category]}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(product.unit_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Change settings */}
          <Card>
            <CardHeader>
              <CardTitle>Nastavení změny</CardTitle>
              <CardDescription>
                Zadejte hodnotu přeceňování
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-48">
                  <Label>Typ změny</Label>
                  <Select
                    value={changeType}
                    onValueChange={(v) => setChangeType(v as ChangeType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <span className="flex items-center gap-2">
                          <Percent className="w-4 h-4" />
                          Procentuální
                        </span>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Fixní částka
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="change-value">
                    Hodnota ({changeType === 'percentage' ? '%' : 'Kč'})
                  </Label>
                  <Input
                    id="change-value"
                    type="number"
                    step={changeType === 'percentage' ? '0.1' : '1'}
                    placeholder={
                      changeType === 'percentage'
                        ? 'např. 5 nebo -10'
                        : 'např. 1000 nebo -500'
                    }
                    value={changeValue}
                    onChange={(e) => setChangeValue(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Důvod změny (volitelné)</Label>
                <Input
                  id="reason"
                  placeholder="např. Roční aktualizace ceníku 2026"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <Button
                onClick={handlePreview}
                disabled={selectedIds.size === 0 || !changeValue}
              >
                Zobrazit náhled změn
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Import cen z CSV
              </CardTitle>
              <CardDescription>
                Vložte CSV data ve formátu: kód;cena (jeden produkt na řádek)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-data">CSV data</Label>
                <Textarea
                  id="csv-data"
                  rows={10}
                  placeholder={`Příklad:
BAZ-OBD-SK-3-6-1.2;150000
BAZ-KRU-PR-3-1.5;95000
TECH-SKIM-01;25000`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button onClick={parseCSV} disabled={!csvText.trim()}>
                Parsovat a zobrazit náhled
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog - Bulk */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Náhled změn cen</DialogTitle>
            <DialogDescription>
              Zkontrolujte změny před aplikováním.{' '}
              {changeType === 'percentage'
                ? `Změna: ${changeValue}%`
                : `Změna: ${formatPrice(parseFloat(changeValue) || 0)}`}
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-right">Původní cena</TableHead>
                <TableHead className="text-center"></TableHead>
                <TableHead className="text-right">Nová cena</TableHead>
                <TableHead className="text-right">Změna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewChanges.map((change) => (
                <TableRow key={change.productId}>
                  <TableCell className="font-medium">
                    {change.productName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(change.oldPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(change.newPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        change.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {formatChange(change.change)}
                      <span className="text-muted-foreground text-sm ml-1">
                        ({change.changePercentage >= 0 ? '+' : ''}
                        {change.changePercentage.toFixed(1)}%)
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {reason && (
            <div className="text-sm text-muted-foreground">
              <strong>Důvod:</strong> {reason}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleApply} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Aplikovat změny ({previewChanges.length} produktů)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - CSV */}
      <Dialog open={csvPreviewOpen} onOpenChange={setCsvPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Náhled CSV importu</DialogTitle>
            <DialogDescription>
              Nalezeno {csvRows.filter((r) => r.found).length} z {csvRows.length}{' '}
              produktů
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Stav</TableHead>
                <TableHead>Kód</TableHead>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-right">Původní cena</TableHead>
                <TableHead className="text-right">Nová cena</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {csvRows.map((row, index) => (
                <TableRow
                  key={index}
                  className={!row.found ? 'opacity-50' : undefined}
                >
                  <TableCell>
                    {row.found ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell>
                    {row.found ? row.productName : 'Nenalezeno'}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.found ? formatPrice(row.oldPrice || 0) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(row.price)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvPreviewOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleApplyCSV}
              disabled={loading || csvRows.filter((r) => r.found).length === 0}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importovat ({csvRows.filter((r) => r.found).length} produktů)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
