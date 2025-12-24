'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Save,
  FileDown,
  Package,
  Loader2,
} from 'lucide-react'
import type { Product, Configuration, QuoteItemCategory } from '@/lib/supabase/types'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  formatDimensions,
} from '@/lib/constants/configurator'

interface QuoteItem {
  id: string
  product_id: string | null
  name: string
  description: string
  category: QuoteItemCategory
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

interface QuoteEditorProps {
  quoteNumber: string
  products: Product[]
  configuration?: Configuration | null
  existingQuote?: {
    id: string
    customer_name: string
    customer_email: string
    customer_phone: string
    customer_address: string
    notes: string
    valid_until: string
    items: QuoteItem[]
  }
}

const CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazény',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
  prace: 'Práce',
  doprava: 'Doprava',
  jine: 'Jiné',
}

export function QuoteEditor({
  quoteNumber,
  products,
  configuration,
  existingQuote,
}: QuoteEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Customer info
  const [customerName, setCustomerName] = useState(
    existingQuote?.customer_name || configuration?.contact_name || ''
  )
  const [customerEmail, setCustomerEmail] = useState(
    existingQuote?.customer_email || configuration?.contact_email || ''
  )
  const [customerPhone, setCustomerPhone] = useState(
    existingQuote?.customer_phone || configuration?.contact_phone || ''
  )
  const [customerAddress, setCustomerAddress] = useState(
    existingQuote?.customer_address || configuration?.contact_address || ''
  )

  // Quote details
  const [notes, setNotes] = useState(existingQuote?.notes || '')
  const [validUntil, setValidUntil] = useState(
    existingQuote?.valid_until ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )

  // Items
  const [items, setItems] = useState<QuoteItem[]>(existingQuote?.items || [])

  // Add product to quote
  const addProduct = useCallback((product: Product) => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      name: product.name,
      description: product.description || '',
      category: product.category as QuoteItemCategory,
      quantity: 1,
      unit: product.unit,
      unit_price: product.unit_price,
      total_price: product.unit_price,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  // Add custom item
  const addCustomItem = useCallback(() => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product_id: null,
      name: '',
      description: '',
      category: 'jine',
      quantity: 1,
      unit: 'ks',
      unit_price: 0,
      total_price: 0,
    }
    setItems((prev) => [...prev, newItem])
  }, [])

  // Update item
  const updateItem = useCallback((id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...updates }
        // Recalculate total price
        if ('quantity' in updates || 'unit_price' in updates) {
          updated.total_price = updated.quantity * updated.unit_price
        }
        return updated
      })
    )
  }, [])

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Save quote
  const handleSave = async () => {
    if (!customerName.trim()) {
      alert('Vyplňte jméno zákazníka')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/quotes', {
        method: existingQuote ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existingQuote?.id,
          quote_number: quoteNumber,
          configuration_id: configuration?.id || null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          pool_config: configuration
            ? {
                shape: configuration.pool_shape,
                type: configuration.pool_type,
                dimensions: configuration.dimensions,
                color: configuration.color,
                stairs: configuration.stairs,
                technology: configuration.technology,
              }
            : null,
          valid_until: validUntil,
          notes,
          items: items.map((item, index) => ({
            product_id: item.product_id,
            name: item.name,
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            sort_order: index,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/admin/nabidky/${data.id}`)
      } else {
        const error = await response.json()
        console.error('Save error:', error)
        alert(error.error || 'Chyba při ukládání')
      }
    } catch (err) {
      console.error('Connection error:', err)
      alert('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  // Save and download PDF
  const handleSaveAndDownloadPdf = async () => {
    if (!customerName.trim()) {
      alert('Vyplňte jméno zákazníka')
      return
    }

    if (items.length === 0) {
      alert('Přidejte alespoň jednu položku')
      return
    }

    setSaving(true)

    try {
      // First save the quote
      const response = await fetch('/api/admin/quotes', {
        method: existingQuote ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existingQuote?.id,
          quote_number: quoteNumber,
          configuration_id: configuration?.id || null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          pool_config: configuration
            ? {
                shape: configuration.pool_shape,
                type: configuration.pool_type,
                dimensions: configuration.dimensions,
                color: configuration.color,
                stairs: configuration.stairs,
                technology: configuration.technology,
              }
            : null,
          valid_until: validUntil,
          notes,
          items: items.map((item, index) => ({
            product_id: item.product_id,
            name: item.name,
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            sort_order: index,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Download PDF
        window.open(`/api/admin/quotes/${data.id}/pdf`, '_blank')
        router.push(`/admin/nabidky/${data.id}`)
      } else {
        const error = await response.json()
        console.error('Save error:', error)
        alert(error.error || 'Chyba při ukládání')
      }
    } catch (err) {
      console.error('Connection error:', err)
      alert('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  // Group products by category
  const productsByCategory = products.reduce(
    (acc, product) => {
      const cat = product.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(product)
      return acc
    },
    {} as Record<string, Product[]>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Customer info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zákazník</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Jméno *
              </Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Jan Novák"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="jan@email.cz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefon
              </Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+420 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adresa
              </Label>
              <Input
                id="address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Ulice, Město"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pool configuration (if from configurator) */}
        {configuration && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konfigurace bazénu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tvar:</span>{' '}
                  <span className="font-medium">{getShapeLabel(configuration.pool_shape)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Typ:</span>{' '}
                  <span className="font-medium">{getTypeLabel(configuration.pool_type)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rozměry:</span>{' '}
                  <span className="font-medium">
                    {formatDimensions(configuration.pool_shape, configuration.dimensions)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Barva:</span>{' '}
                  <span className="font-medium">{getColorLabel(configuration.color)}</span>
                </div>
                {configuration.stairs && configuration.stairs !== 'none' && (
                  <div>
                    <span className="text-muted-foreground">Schodiště:</span>{' '}
                    <span className="font-medium">{getStairsLabel(configuration.stairs)}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Technologie:</span>{' '}
                  <span className="font-medium">
                    {Array.isArray(configuration.technology)
                      ? configuration.technology.map(t => getTechnologyLabel(t)).join(', ')
                      : getTechnologyLabel(configuration.technology)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Položky nabídky</CardTitle>
            <Button variant="outline" size="sm" onClick={addCustomItem}>
              <Plus className="w-4 h-4 mr-2" />
              Vlastní položka
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Zatím žádné položky. Přidejte produkty z katalogu vpravo.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder="Název položky"
                        className="font-medium"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Select
                        value={item.category}
                        onValueChange={(value) =>
                          updateItem(item.id, { category: value as QuoteItemCategory })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          min={0}
                          step={1}
                          className="w-20"
                        />
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          className="w-16"
                        />
                      </div>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })
                        }
                        min={0}
                        placeholder="Cena/ks"
                      />
                      <div className="flex items-center justify-end font-semibold">
                        {formatPrice(item.total_price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {items.length > 0 && (
              <>
                <Separator />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Celkem</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Poznámky</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Poznámky pro zákazníka</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatečné informace k nabídce..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Platnost nabídky do</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Product catalog */}
      <div className="space-y-6">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Katalog produktů
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto space-y-4">
            {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
              <div key={category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {CATEGORY_LABELS[category as QuoteItemCategory] || category}
                </h4>
                <div className="space-y-1">
                  {categoryProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-muted-foreground">
                        {formatPrice(product.unit_price)} / {product.unit}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Žádné produkty. Synchronizujte z Pipedrive.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !customerName}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Uložit nabídku
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSaveAndDownloadPdf}
              disabled={saving || items.length === 0 || !customerName.trim()}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Uložit a stáhnout PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
