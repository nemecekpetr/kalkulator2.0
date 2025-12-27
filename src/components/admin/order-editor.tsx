'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, OrderItem } from '@/lib/supabase/types'

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
          deposit_amount: parseFloat(String(formData.deposit_amount)) || 0,
          notes: formData.notes || null,
          internal_notes: formData.internal_notes || null,
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
              <Label htmlFor="delivery_date">Plánované datum dodání</Label>
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
                Adresa dodání (pokud jiná než adresa zákazníka)
              </Label>
              <Input
                id="delivery_address"
                name="delivery_address"
                value={formData.delivery_address}
                onChange={handleChange}
              />
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
                Doporučená záloha: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(order.total_price * 0.5)} (50%)
              </p>
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
                {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(order.total_price)}
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
