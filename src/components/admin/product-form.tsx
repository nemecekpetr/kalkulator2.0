'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
import { Loader2, Save, ArrowLeft, Info, X, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductCategory, PriceType, CoefficientUnit, SetAddon } from '@/lib/supabase/types'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/constants/categories'

interface ProductFormProps {
  product?: Product
  products?: Product[] // For reference product selection
  mode: 'create' | 'edit'
}

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Fixní cena',
  percentage: 'Procentuální příplatek',
  coefficient: 'Koeficient',
}

const PRICE_TYPE_DESCRIPTIONS: Record<PriceType, string> = {
  fixed: 'Pevná cena za jednotku',
  percentage: 'Procento z ceny referenčního produktu',
  coefficient: 'Koeficient × měření bazénu (povrch nebo obvod)',
}

const COEFFICIENT_UNIT_LABELS: Record<CoefficientUnit, string> = {
  m2: 'm² (povrch)',
  bm: 'bm (obvod)',
}

const COEFFICIENT_UNIT_DESCRIPTIONS: Record<CoefficientUnit, string> = {
  m2: 'Metr čtvereční - povrch bazénu (stěny + dno)',
  bm: 'Běžný metr - obvod bazénového skeletu',
}

const UNIT_OPTIONS = ['ks', 'm', 'm²', 'm³', 'kg', 'l', 'hod', 'km', 'komplet', 'sada']

export function ProductForm({ product, products = [], mode }: ProductFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState(product?.name || '')
  const [code, setCode] = useState(product?.code || '')
  const [oldCode, setOldCode] = useState(product?.old_code || '')
  const [description, setDescription] = useState(product?.description || '')
  const [category, setCategory] = useState<ProductCategory>(product?.category || 'jine')
  const [subcategory, setSubcategory] = useState(product?.subcategory || '')
  const [manufacturer, setManufacturer] = useState(product?.manufacturer || '')
  const [unitPrice, setUnitPrice] = useState(product?.unit_price?.toString() || '0')
  const [unit, setUnit] = useState(product?.unit || 'ks')
  const [active, setActive] = useState(product?.active ?? true)

  // New pricing fields
  const [priceType, setPriceType] = useState<PriceType>(product?.price_type || 'fixed')
  const [priceReferenceProductId, setPriceReferenceProductId] = useState(
    product?.price_reference_product_id || ''
  )
  const [pricePercentage, setPricePercentage] = useState(
    product?.price_percentage?.toString() || ''
  )
  const [priceMinimum, setPriceMinimum] = useState(product?.price_minimum?.toString() || '')
  const [priceCoefficient, setPriceCoefficient] = useState(
    product?.price_coefficient?.toString() || ''
  )
  const [coefficientUnit, setCoefficientUnit] = useState<CoefficientUnit>(
    product?.coefficient_unit || 'm2'
  )
  const [requiredSurchargeIds, setRequiredSurchargeIds] = useState<string[]>(
    product?.required_surcharge_ids || []
  )
  const [tags, setTags] = useState<string[]>(product?.tags || [])
  const [newTag, setNewTag] = useState('')

  // Set addons (only for category 'sety')
  const [setAddons, setSetAddons] = useState<SetAddon[]>(
    product?.set_addons || []
  )

  // Reference product for display
  const [referenceProduct, setReferenceProduct] = useState<Product | null>(null)

  // Load reference product when selected
  useEffect(() => {
    if (priceReferenceProductId && products.length > 0) {
      const ref = products.find((p) => p.id === priceReferenceProductId)
      setReferenceProduct(ref || null)
    } else {
      setReferenceProduct(null)
    }
  }, [priceReferenceProductId, products])

  // Calculate preview price for percentage type
  const previewPercentagePrice =
    priceType === 'percentage' && referenceProduct && pricePercentage
      ? (referenceProduct.unit_price * parseFloat(pricePercentage)) / 100
      : null

  // Calculate preview for coefficient (example pool 3×6m)
  const exampleSurface = 39.6 // m² for 3×6×1.2m pool
  const examplePerimeter = 18 // bm for 3×6m pool
  const exampleMeasurement = coefficientUnit === 'm2' ? exampleSurface : examplePerimeter
  const previewCoefficientPrice =
    priceType === 'coefficient' && priceCoefficient
      ? exampleMeasurement * parseFloat(priceCoefficient)
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Název produktu je povinný')
      return
    }

    if (!category) {
      toast.error('Kategorie je povinná')
      return
    }

    // Validate price type specific fields
    if (priceType === 'percentage') {
      if (!priceReferenceProductId) {
        toast.error('Pro procentuální cenu vyberte referenční produkt')
        return
      }
      if (!pricePercentage || parseFloat(pricePercentage) <= 0) {
        toast.error('Zadejte procento')
        return
      }
    }

    if (priceType === 'coefficient') {
      if (!priceCoefficient || parseFloat(priceCoefficient) <= 0) {
        toast.error('Zadejte koeficient')
        return
      }
    }

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || null,
        old_code: oldCode.trim() || null,
        description: description.trim() || null,
        category,
        subcategory: subcategory.trim() || null,
        manufacturer: manufacturer.trim() || null,
        unit_price: parseFloat(unitPrice) || 0,
        unit: unit || 'ks',
        active,
        price_type: priceType,
        price_reference_product_id:
          priceType === 'percentage' ? priceReferenceProductId || null : null,
        price_percentage:
          priceType === 'percentage' ? parseFloat(pricePercentage) || null : null,
        price_minimum:
          priceType === 'percentage' && priceMinimum ? parseFloat(priceMinimum) : null,
        price_coefficient:
          priceType === 'coefficient' ? parseFloat(priceCoefficient) || null : null,
        coefficient_unit: priceType === 'coefficient' ? coefficientUnit : 'm2',
        required_surcharge_ids: requiredSurchargeIds.length > 0 ? requiredSurchargeIds : null,
        tags: tags.length > 0 ? tags : null,
        set_addons: category === 'sety' && setAddons.length > 0 ? setAddons : null,
      }

      const url =
        mode === 'create' ? '/api/admin/products' : `/api/admin/products/${product?.id}`
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

      toast.success(mode === 'create' ? 'Produkt vytvořen' : 'Produkt uložen')
      router.push('/admin/produkty')
      router.refresh()
    } catch (error) {
      console.error('Save product error:', error)
      toast.error(error instanceof Error ? error.message : 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  const addTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const addRequiredSurcharge = (productId: string) => {
    if (!requiredSurchargeIds.includes(productId)) {
      setRequiredSurchargeIds([...requiredSurchargeIds, productId])
    }
  }

  const removeRequiredSurcharge = (productId: string) => {
    setRequiredSurchargeIds(requiredSurchargeIds.filter((id) => id !== productId))
  }

  // Set addon management
  const addSetAddon = () => {
    const newAddon: SetAddon = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      sort_order: setAddons.length,
    }
    setSetAddons([...setAddons, newAddon])
  }

  const updateSetAddon = (id: string, updates: Partial<SetAddon>) => {
    setSetAddons(setAddons.map((a) => (a.id === id ? { ...a, ...updates } : a)))
  }

  const removeSetAddon = (id: string) => {
    setSetAddons(setAddons.filter((a) => a.id !== id))
  }

  const moveSetAddon = (id: string, direction: 'up' | 'down') => {
    const idx = setAddons.findIndex((a) => a.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= setAddons.length) return
    const next = [...setAddons]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setSetAddons(next.map((a, i) => ({ ...a, sort_order: i })))
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
          onClick={() => router.push('/admin/produkty')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na produkty
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {mode === 'create' ? 'Vytvořit produkt' : 'Uložit změny'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Základní informace</CardTitle>
            <CardDescription>Název, kód a popis produktu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Název *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Název produktu"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kód</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Např. BAZ-OBD-SK-3-6-1.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oldCode">Starý kód</Label>
                <Input
                  id="oldCode"
                  value={oldCode}
                  onChange={(e) => setOldCode(e.target.value)}
                  placeholder="Pro kompatibilitu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailní popis produktu"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategorie *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte kategorii" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {PRODUCT_CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subkategorie</Label>
                <Input
                  id="subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Volitelná subkategorie"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Výrobce</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Název výrobce"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Stav</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Aktivní</Label>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Neaktivní produkty se nezobrazují v nabídkách
            </p>

            {/* Tags */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Tagy</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nový tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cena</CardTitle>
            <CardDescription>Nastavení ceny a způsobu výpočtu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="priceType">Typ ceny</Label>
              <Select value={priceType} onValueChange={(v) => setPriceType(v as PriceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {PRICE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {PRICE_TYPE_DESCRIPTIONS[priceType]}
              </p>
            </div>

            {/* Fixed price fields */}
            {priceType === 'fixed' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Cena za jednotku (Kč)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="1"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Jednotka</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Percentage price fields */}
            {priceType === 'percentage' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceProduct">Referenční produkt *</Label>
                  <Select
                    value={priceReferenceProductId}
                    onValueChange={setPriceReferenceProductId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte produkt" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter((p) => p.id !== product?.id && p.price_type === 'fixed')
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({formatPrice(p.unit_price)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentage">Procento (%)</Label>
                    <Input
                      id="percentage"
                      type="number"
                      min="0"
                      step="0.1"
                      value={pricePercentage}
                      onChange={(e) => setPricePercentage(e.target.value)}
                      placeholder="Např. 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum">Minimální cena (Kč)</Label>
                    <Input
                      id="minimum"
                      type="number"
                      min="0"
                      step="1"
                      value={priceMinimum}
                      onChange={(e) => setPriceMinimum(e.target.value)}
                      placeholder="Volitelné"
                    />
                  </div>
                </div>

                {/* Preview */}
                {referenceProduct && previewPercentagePrice !== null && (
                  <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Náhled výpočtu:</p>
                      <p className="text-muted-foreground">
                        {pricePercentage}% z {formatPrice(referenceProduct.unit_price)} ={' '}
                        <span className="font-medium text-foreground">
                          {formatPrice(previewPercentagePrice)}
                        </span>
                        {priceMinimum &&
                          previewPercentagePrice < parseFloat(priceMinimum) && (
                            <span className="text-orange-600">
                              {' '}
                              (použito minimum {formatPrice(parseFloat(priceMinimum))})
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coefficient fields */}
            {priceType === 'coefficient' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coefficientUnit">Jednotka výpočtu</Label>
                    <Select
                      value={coefficientUnit}
                      onValueChange={(v) => setCoefficientUnit(v as CoefficientUnit)}
                    >
                      <SelectTrigger id="coefficientUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(COEFFICIENT_UNIT_LABELS) as CoefficientUnit[]).map((u) => (
                          <SelectItem key={u} value={u}>
                            {COEFFICIENT_UNIT_LABELS[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {COEFFICIENT_UNIT_DESCRIPTIONS[coefficientUnit]}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coefficient">Koeficient</Label>
                    <Input
                      id="coefficient"
                      type="number"
                      min="0"
                      step="1"
                      value={priceCoefficient}
                      onChange={(e) => setPriceCoefficient(e.target.value)}
                      placeholder="Např. 650"
                    />
                  </div>
                </div>

                {/* Preview */}
                {previewCoefficientPrice !== null && (
                  <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">
                        Příklad výpočtu (bazén 3×6×1.2m):
                      </p>
                      <p className="text-muted-foreground">
                        {coefficientUnit === 'm2' ? (
                          <>Povrch: {exampleSurface} m²</>
                        ) : (
                          <>Obvod: {examplePerimeter} bm</>
                        )}
                        {' × '}{priceCoefficient} Kč ={' '}
                        <span className="font-medium text-foreground">
                          {formatPrice(previewCoefficientPrice)}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Required surcharges */}
        <Card>
          <CardHeader>
            <CardTitle>Automatické příplatky</CardTitle>
            <CardDescription>
              Produkty, které se automaticky přidají k tomuto produktu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value=""
              onValueChange={(v) => {
                if (v) addRequiredSurcharge(v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Přidat produkt" />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter(
                    (p) =>
                      p.id !== product?.id && !requiredSurchargeIds.includes(p.id) && p.active
                  )
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {requiredSurchargeIds.length > 0 && (
              <div className="space-y-2">
                {requiredSurchargeIds.map((id) => {
                  const surchargeProduct = products.find((p) => p.id === id)
                  if (!surchargeProduct) return null
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm">{surchargeProduct.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeRequiredSurcharge(id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {requiredSurchargeIds.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Žádné automatické příplatky
              </p>
            )}
          </CardContent>
        </Card>

        {/* Set addons - only for 'sety' category */}
        {category === 'sety' && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Doplňky setu</CardTitle>
              <CardDescription>
                Volitelné příplatky specifické pro tento set (hloubka, rohy, schody apod.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setAddons.length > 0 && (
                <div className="space-y-2">
                  {setAddons.map((addon, idx) => (
                    <div
                      key={addon.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          disabled={idx === 0}
                          onClick={() => moveSetAddon(addon.id, 'up')}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          disabled={idx === setAddons.length - 1}
                          onClick={() => moveSetAddon(addon.id, 'down')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        value={addon.name}
                        onChange={(e) =>
                          updateSetAddon(addon.id, { name: e.target.value })
                        }
                        placeholder="Název příplatku"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={addon.price}
                        onChange={(e) =>
                          updateSetAddon(addon.id, {
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Cena"
                        className="w-32"
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Kč
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeSetAddon(addon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSetAddon}
              >
                <Plus className="w-4 h-4 mr-2" />
                Přidat příplatek
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  )
}
