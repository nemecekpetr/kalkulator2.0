'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Loader2,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductGroup, ProductGroupItem } from '@/lib/supabase/types'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/constants/categories'

interface ProductGroupEditorProps {
  group?: ProductGroup & { items?: ProductGroupItem[] }
  products: Product[]
  mode: 'create' | 'edit'
}

interface GroupItem {
  product_id: string
  quantity: number
  product?: Product
}

const GROUP_CATEGORIES = [
  { value: 'zaklad', label: 'Základní balíčky' },
  { value: 'technologie', label: 'Technologie' },
  { value: 'prislusenstvi', label: 'Příslušenství' },
  { value: 'servis', label: 'Servis' },
  { value: 'jine', label: 'Jiné' },
]

export function ProductGroupEditor({ group, products, mode }: ProductGroupEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Form state
  const [name, setName] = useState(group?.name || '')
  const [description, setDescription] = useState(group?.description || '')
  const [category, setCategory] = useState(group?.category || '')
  const [active, setActive] = useState(group?.active ?? true)
  const [items, setItems] = useState<GroupItem[]>(() => {
    if (group?.items) {
      return group.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        product: item.product || products.find((p) => p.id === item.product_id),
      }))
    }
    return []
  })

  // Update product references when products change
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        product: products.find((p) => p.id === item.product_id),
      }))
    )
  }, [products])

  // Calculate total price
  const totalPrice = items.reduce((sum, item) => {
    const price = item.product?.unit_price || 0
    return sum + price * item.quantity
  }, 0)

  // Filtered products for dialog
  const filteredProducts = products.filter((p) => {
    if (!productSearch) return p.active
    const search = productSearch.toLowerCase()
    return (
      p.active &&
      (p.name.toLowerCase().includes(search) ||
        p.code?.toLowerCase().includes(search))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Název skupiny je povinný')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        active,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      }

      const url =
        mode === 'create'
          ? '/api/admin/product-groups'
          : `/api/admin/product-groups/${group?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Chyba při ukládání')
      }

      toast.success(mode === 'create' ? 'Skupina vytvořena' : 'Skupina uložena')
      router.push('/admin/nastaveni/produkty/skupiny')
      router.refresh()
    } catch (error) {
      console.error('Save group error:', error)
      toast.error(error instanceof Error ? error.message : 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  const addProduct = (product: Product) => {
    if (items.some((item) => item.product_id === product.id)) {
      toast.error('Produkt je již ve skupině')
      return
    }
    setItems([...items, { product_id: product.id, quantity: 1, product }])
    setProductDialogOpen(false)
    setProductSearch('')
  }

  const removeProduct = (productId: string) => {
    setItems(items.filter((item) => item.product_id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setItems(
      items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    )
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const newItems = [...items]
    const [removed] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, removed)
    setItems(newItems)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/nastaveni/produkty/skupiny')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na skupiny
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {mode === 'create' ? 'Vytvořit skupinu' : 'Uložit změny'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Základní informace</CardTitle>
            <CardDescription>Název a popis skupiny produktů</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Název skupiny *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Např. Základní technologie skimmer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Volitelný popis skupiny"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte kategorii" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Status & Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Stav</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Aktivní</Label>
              <Switch id="active" checked={active} onCheckedChange={setActive} />
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">Počet položek</div>
              <div className="text-2xl font-bold">{items.length}</div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">Celková cena</div>
              <div className="text-2xl font-bold text-primary">
                {formatPrice(totalPrice)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Produkty ve skupině</CardTitle>
                <CardDescription>
                  Produkty, které se vloží do nabídky při použití této skupiny
                </CardDescription>
              </div>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button">
                    <Plus className="w-4 h-4 mr-2" />
                    Přidat produkt
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Přidat produkt do skupiny</DialogTitle>
                    <DialogDescription>
                      Vyberte produkt, který chcete přidat do skupiny
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Hledat produkty..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Žádné produkty nenalezeny
                        </div>
                      ) : (
                        filteredProducts.slice(0, 50).map((product) => {
                          const isInGroup = items.some(
                            (item) => item.product_id === product.id
                          )
                          return (
                            <div
                              key={product.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isInGroup
                                  ? 'bg-muted opacity-50'
                                  : 'hover:bg-muted cursor-pointer'
                              }`}
                              onClick={() => !isInGroup && addProduct(product)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.code || 'Bez kódu'} ·{' '}
                                    {PRODUCT_CATEGORY_LABELS[product.category]}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatPrice(product.unit_price)}
                                </div>
                                {isInGroup && (
                                  <div className="text-xs text-muted-foreground">
                                    Již přidáno
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                      {filteredProducts.length > 50 && (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          Zobrazeno prvních 50 výsledků. Upřesněte vyhledávání.
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Žádné produkty ve skupině</p>
                <p className="text-sm">Klikněte na &quot;Přidat produkt&quot; pro přidání</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pořadí</TableHead>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="w-24">Množství</TableHead>
                    <TableHead className="text-right">Cena/ks</TableHead>
                    <TableHead className="text-right">Celkem</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => moveItem(index, 'up')}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 'down')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {item.product?.name || 'Neznámý produkt'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.product?.code || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.product
                          ? PRODUCT_CATEGORY_LABELS[item.product.category]
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.product_id, parseInt(e.target.value) || 1)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.product?.unit_price || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice((item.product?.unit_price || 0) * item.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeProduct(item.product_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
