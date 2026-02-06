'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, OrderItem } from '@/lib/supabase/types'

const formatCZK = (price: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(price)

interface OrderEditorProps {
  order: Order & { items: OrderItem[] }
}

export function OrderEditor({ order }: OrderEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customer_name: order.customer_name,
    customer_email: order.customer_email || '',
    customer_phone: order.customer_phone || '',
    customer_address: order.customer_address || '',
    customer_ico: order.customer_ico || '',
    customer_dic: order.customer_dic || '',
    contract_date: order.contract_date || '',
    delivery_date: order.delivery_date || '',
    delivery_address: order.delivery_address || '',
    deposit_amount: order.deposit_amount || 0,
    notes: order.notes || '',
    internal_notes: order.internal_notes || '',
    // New contract fields
    fulfillment_address: order.fulfillment_address || order.customer_address || '',
    construction_readiness_date: order.construction_readiness_date || '',
    expected_delivery_date: order.expected_delivery_date || '',
    delivery_method: order.delivery_method || 'rentmil_dap',
    delivery_cost: order.delivery_cost || 0,
    delivery_cost_free: order.delivery_cost_free ?? true,
    total_weight: order.total_weight ?? '',
    vat_rate: order.vat_rate ?? 12,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Computed values
  const vatRate = parseFloat(String(formData.vat_rate)) || 12
  const priceWithoutVat = Math.round(order.total_price / (1 + vatRate / 100))
  const vatAmount = order.total_price - priceWithoutVat
  const depositAmount = parseFloat(String(formData.deposit_amount)) || 0
  const halfPrice = Math.round(order.total_price / 2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email || null,
          customer_phone: formData.customer_phone || null,
          customer_address: formData.customer_address || null,
          customer_ico: formData.customer_ico || null,
          customer_dic: formData.customer_dic || null,
          contract_date: formData.contract_date || null,
          delivery_date: formData.delivery_date || null,
          delivery_address: formData.delivery_address || null,
          deposit_amount: depositAmount,
          notes: formData.notes || null,
          internal_notes: formData.internal_notes || null,
          // New contract fields
          fulfillment_address: formData.fulfillment_address || null,
          construction_readiness_date: formData.construction_readiness_date || null,
          expected_delivery_date: formData.expected_delivery_date || null,
          delivery_method: formData.delivery_method || null,
          delivery_cost: parseFloat(String(formData.delivery_cost)) || 0,
          delivery_cost_free: formData.delivery_cost_free,
          total_weight: formData.total_weight ? parseFloat(String(formData.total_weight)) : null,
          vat_rate: vatRate,
        }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast.success('Objednávka byla uložena')
      router.push(`/admin/objednavky/${order.id}`)
      router.refresh()
    } catch (error) {
      toast.error('Nepodařilo se uložit objednávku')
      console.error('Error saving order:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Check if delivery_method is a custom value
  const isCustomDelivery = formData.delivery_method !== 'rentmil_dap' && formData.delivery_method !== 'self_pickup'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer info */}
        <Card>
          <CardHeader>
            <CardTitle>Zákazník</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer_name">Jméno *</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_email">E-mail</Label>
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="customer_phone">Telefon</Label>
              <Input
                id="customer_phone"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="customer_address">Adresa</Label>
              <Input
                id="customer_address"
                name="customer_address"
                value={formData.customer_address}
                onChange={handleChange}
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_ico">IČO</Label>
                <Input
                  id="customer_ico"
                  name="customer_ico"
                  value={formData.customer_ico}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="customer_dic">DIČ</Label>
                <Input
                  id="customer_dic"
                  name="customer_dic"
                  value={formData.customer_dic}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract & delivery */}
        <Card>
          <CardHeader>
            <CardTitle>Smlouva a dodání</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contract_date">Datum podpisu smlouvy</Label>
              <Input
                id="contract_date"
                name="contract_date"
                type="date"
                value={formData.contract_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="fulfillment_address">Místo plnění</Label>
              <Input
                id="fulfillment_address"
                name="fulfillment_address"
                value={formData.fulfillment_address}
                onChange={handleChange}
                placeholder="Adresa místa plnění"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Výchozí: adresa zákazníka
              </p>
            </div>
            <div>
              <Label htmlFor="construction_readiness_date">Termín stavební připravenosti</Label>
              <Input
                id="construction_readiness_date"
                name="construction_readiness_date"
                type="date"
                value={formData.construction_readiness_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="expected_delivery_date">Předpokládaný termín dodání</Label>
              <Input
                id="expected_delivery_date"
                name="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="delivery_date">Potvrzený termín dodání</Label>
              <Input
                id="delivery_date"
                name="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="delivery_address">
                Adresa dodání (pokud jiná než místo plnění)
              </Label>
              <Input
                id="delivery_address"
                name="delivery_address"
                value={formData.delivery_address}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Delivery method & weight */}
        <Card>
          <CardHeader>
            <CardTitle>Doprava</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Způsob dopravy</Label>
              <Select
                value={isCustomDelivery ? 'custom' : formData.delivery_method}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setFormData((prev) => ({ ...prev, delivery_method: '' }))
                  } else {
                    setFormData((prev) => ({ ...prev, delivery_method: value }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte způsob dopravy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rentmil_dap">Doprava Rentmil s.r.o. (DAP)</SelectItem>
                  <SelectItem value="self_pickup">Vlastní odběr</SelectItem>
                  <SelectItem value="custom">Jiné...</SelectItem>
                </SelectContent>
              </Select>
              {isCustomDelivery && (
                <Input
                  className="mt-2"
                  name="delivery_method"
                  value={formData.delivery_method}
                  onChange={handleChange}
                  placeholder="Zadejte způsob dopravy..."
                />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="delivery_cost_free">Náklady na dodání</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="delivery_cost_free_switch" className="text-sm text-muted-foreground">
                    Zdarma
                  </Label>
                  <Switch
                    id="delivery_cost_free_switch"
                    checked={formData.delivery_cost_free}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, delivery_cost_free: checked, delivery_cost: checked ? 0 : prev.delivery_cost }))
                    }
                  />
                </div>
              </div>
              {!formData.delivery_cost_free && (
                <div className="relative">
                  <Input
                    id="delivery_cost"
                    name="delivery_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_cost}
                    onChange={handleChange}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Kč
                  </span>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="total_weight">Hmotnost předmětu koupě</Label>
              <div className="relative">
                <Input
                  id="total_weight"
                  name="total_weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_weight}
                  onChange={handleChange}
                  placeholder="např. 850"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  kg
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Orientační údaj ± 5%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment & VAT */}
        <Card>
          <CardHeader>
            <CardTitle>Platba a DPH</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vat_rate">Sazba DPH</Label>
              <div className="relative">
                <Input
                  id="vat_rate"
                  name="vat_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.vat_rate}
                  onChange={handleChange}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            {/* Automatic price breakdown */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cena bez DPH</span>
                <span className="font-medium">{formatCZK(priceWithoutVat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DPH ({vatRate}%)</span>
                <span className="font-medium">{formatCZK(vatAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Celkem vč. DPH</span>
                <span>{formatCZK(order.total_price)}</span>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="deposit_amount">Záloha (Kč)</Label>
              <Input
                id="deposit_amount"
                name="deposit_amount"
                type="number"
                step="0.01"
                value={formData.deposit_amount}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Doporučená záloha: {formatCZK(halfPrice)} (50%)
              </p>
            </div>

            {/* Payment split preview */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">1. splátka (záloha)</span>
                <span className="font-medium">{formatCZK(depositAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">2. splátka (doplatek)</span>
                <span className="font-medium">{formatCZK(order.total_price - depositAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Poznámky</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notes">Poznámky (viditelné v dokumentech)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Poznámky, které se zobrazí v kupní smlouvě..."
            />
          </div>
          <div>
            <Label htmlFor="internal_notes">Interní poznámky</Label>
            <Textarea
              id="internal_notes"
              name="internal_notes"
              rows={3}
              value={formData.internal_notes}
              onChange={handleChange}
              placeholder="Poznámky pouze pro interní použití..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Shrnutí</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Položek</p>
              <p className="text-2xl font-bold">{order.items.length}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Sleva</p>
              <p className="text-2xl font-bold text-green-600">
                {order.discount_percent > 0 ? `${order.discount_percent}%` : '-'}
              </p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Celkem</p>
              <p className="text-2xl font-bold">
                {formatCZK(order.total_price)}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Pro úpravu položek a cen je potřeba upravit zdrojovou nabídku.
          </p>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving}
        >
          Zrušit
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Uložit objednávku
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
