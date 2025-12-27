'use client'

import { useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Check, Loader2, Package, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { ProductMappingRule, Product } from '@/lib/supabase/types'

interface MappingRulesTableProps {
  rules: ProductMappingRule[]
  products: Product[]
}

const CONFIG_FIELD_LABELS: Record<string, string> = {
  stairs: 'Schodiště',
  technology: 'Technologie',
  lighting: 'Osvětlení',
  counterflow: 'Protiproud',
  waterTreatment: 'Úprava vody',
  heating: 'Ohřev',
  roofing: 'Zastřešení',
}

const CONFIG_VALUE_LABELS: Record<string, string> = {
  // Stairs
  roman: 'Románské',
  corner_triangle: 'Trojúhelníkové rohové',
  full_width: 'Přes celou šířku',
  with_bench: 'S relaxační lavicí',
  corner_square: 'Hranaté rohové',
  // Technology
  shaft: 'Šachta',
  wall: 'Stěna',
  other: 'Jiné',
  // Lighting
  led: 'LED',
  // Counterflow
  with_counterflow: 'S protiproudem',
  // Water treatment
  chlorine: 'Chlor',
  salt: 'Sůl',
  // Heating
  preparation: 'Příprava',
  heat_pump: 'Tepelné čerpadlo',
  // Roofing
  with_roofing: 'Se zastřešením',
}

// Define sections for visual grouping
const CONFIG_FIELD_SECTIONS: Record<string, { label: string; description: string; color: string }> = {
  stairs: {
    label: 'Schodiště',
    description: 'Krok 5 konfigurátoru',
    color: 'bg-blue-50 border-blue-200'
  },
  technology: {
    label: 'Technologie',
    description: 'Krok 6 konfigurátoru',
    color: 'bg-purple-50 border-purple-200'
  },
  lighting: {
    label: 'Osvětlení',
    description: 'Krok 7 konfigurátoru - Příslušenství',
    color: 'bg-amber-50 border-amber-200'
  },
  counterflow: {
    label: 'Protiproud',
    description: 'Krok 7 konfigurátoru - Příslušenství',
    color: 'bg-amber-50 border-amber-200'
  },
  waterTreatment: {
    label: 'Úprava vody',
    description: 'Krok 7 konfigurátoru - Příslušenství',
    color: 'bg-amber-50 border-amber-200'
  },
  heating: {
    label: 'Ohřev',
    description: 'Krok 8 konfigurátoru',
    color: 'bg-orange-50 border-orange-200'
  },
  roofing: {
    label: 'Zastřešení',
    description: 'Krok 9 konfigurátoru',
    color: 'bg-green-50 border-green-200'
  },
}

// Order of sections
const SECTION_ORDER = ['stairs', 'technology', 'lighting', 'counterflow', 'waterTreatment', 'heating', 'roofing']

export function MappingRulesTable({ rules, products }: MappingRulesTableProps) {
  const router = useRouter()
  const [selectedRule, setSelectedRule] = useState<ProductMappingRule | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [active, setActive] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)

  // Count rules without products
  const rulesWithoutProducts = rules.filter(r => !r.product_id).length

  const handleAutoAssign = async () => {
    setAutoAssigning(true)
    try {
      const response = await fetch('/api/admin/mapping-rules/auto-assign', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error || 'Chyba při automatickém přiřazení')
      }
    } catch (err) {
      console.error('Auto-assign error:', err)
      toast.error('Chyba připojení')
    } finally {
      setAutoAssigning(false)
    }
  }

  const openDialog = (rule: ProductMappingRule) => {
    setSelectedRule(rule)
    setSelectedProductId(rule.product_id || '')
    setQuantity(rule.quantity || 1)
    setActive(rule.active)
  }

  const closeDialog = () => {
    setSelectedRule(null)
    setSelectedProductId('')
    setQuantity(1)
    setActive(true)
  }

  const handleSave = async () => {
    if (!selectedRule) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/mapping-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRule.id,
          product_id: selectedProductId || null,
          quantity,
          active,
        }),
      })

      if (response.ok) {
        toast.success('Mapování bylo uloženo')
        closeDialog()
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

  // Group rules by config_field
  const rulesByField = rules.reduce(
    (acc, rule) => {
      const field = rule.config_field
      if (!acc[field]) acc[field] = []
      acc[field].push(rule)
      return acc
    },
    {} as Record<string, ProductMappingRule[]>
  )

  // Group products by category for better UX
  const productsByCategory = products.reduce(
    (acc, product) => {
      const cat = product.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(product)
      return acc
    },
    {} as Record<string, Product[]>
  )

  const categoryLabels: Record<string, string> = {
    bazeny: 'Bazény',
    prislusenstvi: 'Příslušenství',
    sluzby: 'Služby',
    doprava: 'Doprava',
  }

  return (
    <>
      {/* Auto-assign button */}
      {rulesWithoutProducts > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">
              {rulesWithoutProducts} pravidel nemá přiřazený produkt
            </p>
            <p className="text-sm text-amber-600">
              Klikněte na tlačítko pro automatické přiřazení podle shodných názvů
            </p>
          </div>
          <Button
            onClick={handleAutoAssign}
            disabled={autoAssigning}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {autoAssigning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            Automaticky přiřadit
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {SECTION_ORDER.map((fieldKey) => {
          const fieldRules = rulesByField[fieldKey]
          if (!fieldRules || fieldRules.length === 0) return null

          const section = CONFIG_FIELD_SECTIONS[fieldKey]

          return (
            <div key={fieldKey} className={`rounded-lg border ${section.color}`}>
              {/* Section Header */}
              <div className={`px-4 py-3 border-b ${section.color}`}>
                <h3 className="font-semibold text-lg">{section.label}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>

              {/* Section Table */}
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Hodnota v konfigurátoru</TableHead>
                    <TableHead>Produkt v nabídce</TableHead>
                    <TableHead className="w-24">Množství</TableHead>
                    <TableHead className="w-32">Cena</TableHead>
                    <TableHead className="w-24">Stav</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldRules.map((rule) => (
                    <TableRow
                      key={rule.id}
                      className="cursor-pointer hover:bg-white/50"
                      onClick={() => openDialog(rule)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {CONFIG_VALUE_LABELS[rule.config_value] || rule.config_value}
                          </Badge>
                          {rule.pool_shape && rule.pool_shape.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              (pouze {rule.pool_shape.join(', ')})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.product ? (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{rule.product.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Nepřiřazeno</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{rule.quantity}×</TableCell>
                      <TableCell>
                        {rule.product ? (
                          <span className="font-medium">{formatPrice(rule.product.unit_price * rule.quantity)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                            Aktivní
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Neaktivní</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!selectedRule} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upravit mapování</DialogTitle>
            <DialogDescription>
              Propojení volby z konfigurátoru s produktem v nabídce
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Source: Configurator */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Konfigurátor (volba zákazníka)
              </p>
              <p className="font-semibold text-blue-900">
                {CONFIG_FIELD_LABELS[selectedRule?.config_field || ''] || selectedRule?.config_field}: {CONFIG_VALUE_LABELS[selectedRule?.config_value || ''] || selectedRule?.config_value}
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <div className="text-muted-foreground text-2xl">↓</div>
            </div>

            {/* Target: Quote */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                Nabídka (produkt pro zákazníka)
              </p>

              {/* Product selection */}
              <div className="space-y-2">
                <Label>Produkt</Label>
                <Select
                  value={selectedProductId || '__none__'}
                  onValueChange={(val) => setSelectedProductId(val === '__none__' ? '' : val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Vyberte produkt..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Bez produktu --</SelectItem>
                    {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                          {categoryLabels[category] || category}
                        </div>
                        {categoryProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{product.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {formatPrice(product.unit_price)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Množství</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="bg-white"
                />
              </div>

              {/* Preview */}
              {selectedProductId && (
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-xs text-muted-foreground mb-1">V nabídce se zobrazí:</p>
                  <p className="font-medium">
                    {products.find(p => p.id === selectedProductId)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {quantity} × {formatPrice(products.find(p => p.id === selectedProductId)?.unit_price || 0)} = {' '}
                    <strong className="text-foreground">{formatPrice((products.find(p => p.id === selectedProductId)?.unit_price || 0) * quantity)}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Label htmlFor="active">Pravidlo aktivní</Label>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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
    </>
  )
}
