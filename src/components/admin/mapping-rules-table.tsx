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
import { AlertCircle, Check, Loader2, Package, Plus, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { ProductMappingRule, Product, ProductCategory } from '@/lib/supabase/types'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/constants/categories'

interface MappingRulesTableProps {
  rules: ProductMappingRule[]
  products: Product[]
}

const CONFIG_FIELD_LABELS: Record<string, string> = {
  technology: 'Technologie',
  lighting: 'Osvětlení',
  counterflow: 'Protiproud',
  waterTreatment: 'Úprava vody',
  heating: 'Ohřev',
  roofing: 'Zastřešení',
}

const CONFIG_VALUE_LABELS: Record<string, string> = {
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
const SECTION_ORDER = ['technology', 'lighting', 'counterflow', 'waterTreatment', 'heating', 'roofing']

export function MappingRulesTable({ rules, products }: MappingRulesTableProps) {
  const router = useRouter()
  const [selectedRule, setSelectedRule] = useState<ProductMappingRule | null>(null)
  // Create mode: adding an extra product to an existing configurator choice
  const [createField, setCreateField] = useState<string | null>(null)
  const [createValue, setCreateValue] = useState<string>('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [active, setActive] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Count rules without products
  const rulesWithoutProducts = rules.filter(r => !r.product_id).length

  // Group rules by config_field (used by handlers + rendering)
  const rulesByField = rules.reduce(
    (acc, rule) => {
      const field = rule.config_field
      if (!acc[field]) acc[field] = []
      acc[field].push(rule)
      return acc
    },
    {} as Record<string, ProductMappingRule[]>
  )

  // Distinct configurator values present in a section (for the "add product" dialog)
  const valuesForField = (field: string) =>
    Array.from(new Set((rulesByField[field] ?? []).map((r) => r.config_value)))

  const handleSeedRules = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/admin/mapping-rules/seed', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error || 'Chyba při vytváření pravidel')
      }
    } catch (err) {
      console.error('Seed error:', err)
      toast.error('Chyba připojení')
    } finally {
      setSeeding(false)
    }
  }

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
    setCreateField(null)
    setSelectedProductId(rule.product_id || '')
    setQuantity(rule.quantity || 1)
    setActive(rule.active)
  }

  const openCreateDialog = (field: string) => {
    // Preselect the first configurator value present in this section
    const firstValue = rulesByField[field]?.[0]?.config_value || ''
    setCreateField(field)
    setCreateValue(firstValue)
    setSelectedRule(null)
    setSelectedProductId('')
    setQuantity(1)
    setActive(true)
  }

  const closeDialog = () => {
    setSelectedRule(null)
    setCreateField(null)
    setCreateValue('')
    setSelectedProductId('')
    setQuantity(1)
    setActive(true)
  }

  // A rule may only be deleted when its choice has more than one rule, so the
  // baseline (seeded) row for a configurator value can never be removed by accident.
  const canDeleteRule = (rule: ProductMappingRule) =>
    rules.filter(
      (r) => r.config_field === rule.config_field && r.config_value === rule.config_value
    ).length > 1

  const handleSave = async () => {
    setSaving(true)
    try {
      // Create mode: add an extra product to an existing choice
      if (createField) {
        if (!createValue) {
          toast.error('Vyberte volbu konfigurátoru')
          setSaving(false)
          return
        }
        const product = products.find((p) => p.id === selectedProductId)
        const maxSort = Math.max(
          0,
          ...(rulesByField[createField]?.map((r) => r.sort_order) ?? [0])
        )
        const response = await fetch('/api/admin/mapping-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: product?.name || `${createField} – ${createValue}`,
            config_field: createField,
            config_value: createValue,
            product_id: selectedProductId || null,
            quantity,
            sort_order: maxSort + 1,
          }),
        })

        if (response.ok) {
          toast.success('Produkt byl přidán k volbě')
          closeDialog()
          router.refresh()
        } else {
          const error = await response.json()
          toast.error(error.error || 'Chyba při ukládání')
        }
        return
      }

      // Edit mode
      if (!selectedRule) return
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

  const handleDelete = async () => {
    if (!selectedRule) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/mapping-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRule.id }),
      })

      if (response.ok) {
        toast.success('Pravidlo bylo smazáno')
        closeDialog()
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Chyba při mazání')
      }
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Chyba připojení')
    } finally {
      setDeleting(false)
    }
  }

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

  // Use centralized category labels
  const categoryLabels = PRODUCT_CATEGORY_LABELS

  // If no rules exist, show seed button
  if (rules.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
        <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Žádná pravidla mapování
        </h3>
        <p className="text-gray-500 mb-6">
          Pravidla mapování propojují volby z konfigurátoru s produkty v nabídce.
          <br />
          Klikněte na tlačítko pro vytvoření výchozích pravidel.
        </p>
        <Button
          onClick={handleSeedRules}
          disabled={seeding}
          size="lg"
        >
          {seeding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Vytvořit výchozí pravidla
        </Button>
      </div>
    )
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
              <div className={`px-4 py-3 border-b ${section.color} flex items-start justify-between gap-4`}>
                <div>
                  <h3 className="font-semibold text-lg">{section.label}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/70"
                  onClick={() => openCreateDialog(fieldKey)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Přidat produkt
                </Button>
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

      {/* Edit / Create Dialog */}
      <Dialog open={!!selectedRule || !!createField} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{createField ? 'Přidat produkt k volbě' : 'Upravit mapování'}</DialogTitle>
            <DialogDescription>
              {createField
                ? 'Přiřaďte k volbě konfigurátoru další produkt – do nabídky se doplní vedle ostatních.'
                : 'Propojení volby z konfigurátoru s produktem v nabídce'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Source: Configurator */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Konfigurátor (volba zákazníka)
              </p>
              {createField ? (
                <div className="space-y-2">
                  <p className="font-semibold text-blue-900">
                    {CONFIG_FIELD_LABELS[createField] || createField}
                  </p>
                  <Select value={createValue} onValueChange={setCreateValue}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Vyberte volbu..." />
                    </SelectTrigger>
                    <SelectContent>
                      {valuesForField(createField).map((value) => (
                        <SelectItem key={value} value={value}>
                          {CONFIG_VALUE_LABELS[value] || value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="font-semibold text-blue-900">
                  {CONFIG_FIELD_LABELS[selectedRule?.config_field || ''] || selectedRule?.config_field}: {CONFIG_VALUE_LABELS[selectedRule?.config_value || ''] || selectedRule?.config_value}
                </p>
              )}
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
                          {categoryLabels[category as ProductCategory] || category}
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

            {/* Active toggle (edit mode only) */}
            {!createField && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor="active">Pravidlo aktivní</Label>
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            {selectedRule && canDeleteRule(selectedRule) ? (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Smazat
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={saving || deleting}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {createField ? 'Přidat' : 'Uložit'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
