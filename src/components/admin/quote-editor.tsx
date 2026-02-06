'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent } from '@/components/ui/tabs'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Save,
  FileDown,
  Loader2,
  Sparkles,
  Pencil,
  GripVertical,
  Layers,
  RefreshCw,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product, Configuration, QuoteItemCategory, GeneratedQuoteItem, QuoteVariantKey, ProductGroupWithItems, PoolShape, PoolDimensions, SetAddon } from '@/lib/supabase/types'
import { checkProductPrerequisites, parseSkeletonCode, calculatePoolSurface, type PrerequisiteCheckResult } from '@/lib/pricing'
import { SkeletonAddonDialog } from './skeleton-addon-dialog'
import { SetAddonDialog, type SetAddonResult } from './set-addon-dialog'
import { ProductCombobox } from './product-combobox'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  formatDimensions,
} from '@/lib/constants/configurator'
import { QUOTE_CATEGORY_LABELS, QUOTE_CATEGORY_ORDER } from '@/lib/constants/categories'
import { czechMonth, CZECH_MONTHS } from '@/lib/utils/czech-month'
import { generateSalutation } from '@/lib/utils/czech-salutation'

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
  variant_keys: QuoteVariantKey[]
  // Set addon fields
  parent_item_id?: string   // For addon items: ID of parent set item
  set_addon_id?: string     // For addon items: addon ID from set_addons JSONB
}

interface QuoteVariantState {
  key: QuoteVariantKey
  name: string
  discount_percent: number
  discount_amount: number
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
    customer_salutation: string | null
    notes: string
    valid_until: string
    delivery_term: string | null
    // Urgency / seasonal availability
    order_deadline: string | null
    delivery_deadline: string | null
    capacity_month: string | null
    available_installations: number | null
    items: (QuoteItem & { variant_ids?: string[] })[]
    variants?: {
      id: string
      variant_key: QuoteVariantKey
      variant_name: string
      discount_percent: number
      discount_amount: number
    }[]
  }
  existingOrder?: { id: string; order_number: string; status: string } | null
}

// Use centralized category labels from constants
const CATEGORY_LABELS = QUOTE_CATEGORY_LABELS

const DEFAULT_VARIANTS: QuoteVariantState[] = [
  { key: 'ekonomicka', name: 'Ekonomická', discount_percent: 0, discount_amount: 0 },
  { key: 'optimalni', name: 'Optimální', discount_percent: 0, discount_amount: 0 },
  { key: 'premiova', name: 'Prémiová', discount_percent: 0, discount_amount: 0 },
]

// Addon product codes (same as skeleton-addon-dialog.tsx)
const SHARP_CORNERS_CODE = 'PRIPLATEK-OSTRE-ROHY'
const THICKNESS_8MM_CODE = 'PRIPLATEK-8MM'

// Price constants
const SHARP_CORNERS_PERCENTAGE = 10 // 10% of skeleton price
const THICKNESS_8MM_PRICE_PER_M2 = 650 // 650 Kč/m²

// Sortable item component for drag and drop
interface SortableItemProps {
  item: QuoteItem
  items: QuoteItem[]
  variants: QuoteVariantState[]
  updateItem: (id: string, updates: Partial<QuoteItem>) => void
  removeItem: (id: string) => void
  toggleItemVariant: (itemId: string, variantKey: QuoteVariantKey) => void
  formatPrice: (price: number) => string
  // Skeleton addon props
  skeletonAddons: Product[]
  products: Product[]
  onToggleSkeletonAddon: (skeletonItemId: string, addonType: 'sharp_corners' | '8mm', checked: boolean) => void
  // Set addon props
  onToggleSetAddon: (setItemId: string, addon: SetAddon, checked: boolean) => void
  // Product combobox
  onProductSelect: (itemId: string, product: Product) => void
}

function SortableQuoteItem({
  item,
  items,
  variants,
  updateItem,
  removeItem,
  toggleItemVariant,
  formatPrice,
  skeletonAddons,
  products,
  onToggleSkeletonAddon,
  onToggleSetAddon,
  onProductSelect,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Check if this is a skeleton item and calculate addon prices
  const skeletonInfo = useMemo(() => {
    if (item.category !== 'skelety' || skeletonAddons.length === 0) {
      return null
    }

    // Get base product to find its code and base price
    const baseProduct = item.product_id
      ? products.find((p) => p.id === item.product_id)
      : null

    // Try to parse dimensions from product code first, then from item name
    const parsed = (baseProduct ? parseSkeletonCode(baseProduct.code) : null) ||
      (() => {
        // Try to parse from item name which might contain dimensions
        // E.g., "Bazénový skelet kruh 2.5m × 1.2m"
        const circleMatch = item.name.match(/(\d+(?:[.,]\d+)?)\s*m?\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*m?/i)
        if (circleMatch && item.name.toLowerCase().includes('kruh')) {
          return {
            shape: 'circle' as PoolShape,
            dimensions: {
              diameter: parseFloat(circleMatch[1].replace(',', '.')),
              depth: parseFloat(circleMatch[2].replace(',', '.')),
            }
          }
        }
        // Rectangle match: e.g., "3×6×1.2m"
        const rectMatch = item.name.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/i)
        if (rectMatch) {
          return {
            shape: (item.name.toLowerCase().includes('ostr') ? 'rectangle_sharp' : 'rectangle_rounded') as PoolShape,
            dimensions: {
              width: parseFloat(rectMatch[1].replace(',', '.')),
              length: parseFloat(rectMatch[2].replace(',', '.')),
              depth: parseFloat(rectMatch[3].replace(',', '.')),
            }
          }
        }
        return null
      })()

    if (!parsed) {
      return null
    }

    const { shape, dimensions } = parsed
    const isCircle = shape === 'circle'

    // Get base skeleton price (from original product, not current item price which may include addons)
    const baseSkeletonPrice = baseProduct?.unit_price ?? item.unit_price

    // Find addon products
    const sharpCornersAddon = skeletonAddons.find((p) => p.code === SHARP_CORNERS_CODE)
    const thickness8mmAddon = skeletonAddons.find((p) => p.code === THICKNESS_8MM_CODE)

    // Calculate addon prices based on BASE skeleton price
    const sharpCornersPrice = Math.round(baseSkeletonPrice * (SHARP_CORNERS_PERCENTAGE / 100))
    const poolSurface = calculatePoolSurface(shape, dimensions)
    const thickness8mmPrice = Math.round(poolSurface * THICKNESS_8MM_PRICE_PER_M2)

    // Check if addons are already included (detect from item name)
    const itemNameLower = item.name.toLowerCase()
    const hasSharpCorners = itemNameLower.includes('ostré rohy')
    const hasThickness8mm = itemNameLower.includes('8mm')

    return {
      isCircle,
      shape,
      dimensions,
      poolSurface,
      baseSkeletonPrice,
      sharpCornersAddon,
      thickness8mmAddon,
      sharpCornersPrice,
      thickness8mmPrice,
      hasSharpCorners,
      hasThickness8mm,
    }
  }, [item, skeletonAddons, products])

  // Detect if this is a set item with available addons
  const setInfo = useMemo(() => {
    // This is a set parent item (not an addon child)
    if (item.category !== 'sety' || item.parent_item_id) return null

    const setProduct = item.product_id
      ? products.find((p) => p.id === item.product_id)
      : null

    const addons = setProduct?.set_addons
    if (!addons || addons.length === 0) return null

    // Find which addons are currently active (exist as child items)
    const activeAddonIds = new Set(
      items
        .filter((i) => i.parent_item_id === item.id && i.set_addon_id)
        .map((i) => i.set_addon_id!)
    )

    return {
      addons: addons.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      activeAddonIds,
    }
  }, [item, items, products])

  // Check if this is a set addon child item
  const isSetAddonChild = !!item.parent_item_id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 p-3 rounded-lg border bg-background ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''} ${isSetAddonChild ? 'ml-6 border-l-2 border-l-primary/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
            title="Přetáhněte pro změnu pořadí"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <ProductCombobox
            value={item.name}
            productId={item.product_id}
            products={products}
            onProductSelect={(product) => onProductSelect(item.id, product)}
            onNameChange={(name) => updateItem(item.id, { name, product_id: null })}
            onClear={() => updateItem(item.id, { product_id: null })}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeItem(item.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
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
            {QUOTE_CATEGORY_ORDER.map((category) => (
              <SelectItem key={category} value={category}>
                {CATEGORY_LABELS[category]}
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
        <div className="flex items-center justify-end font-semibold sm:col-span-2 text-right">
          {formatPrice(item.total_price)}
        </div>
      </div>
      {/* Variant checkboxes */}
      <div className="flex items-center gap-4 pt-1 border-t">
        <span className="text-sm text-muted-foreground">Ve variantách:</span>
        {variants.map((v) => (
          <label
            key={v.key}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={item.variant_keys.includes(v.key)}
              onCheckedChange={() => toggleItemVariant(item.id, v.key)}
            />
            {v.name}
          </label>
        ))}
      </div>
      {/* Skeleton addons section */}
      {skeletonInfo && (skeletonInfo.sharpCornersAddon || skeletonInfo.thickness8mmAddon) && (
        <div className="flex items-center gap-4 pt-2 border-t">
          <span className="text-sm text-muted-foreground">Příplatky:</span>
          {/* Sharp corners - only for rectangles */}
          {skeletonInfo.sharpCornersAddon && !skeletonInfo.isCircle && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={skeletonInfo.hasSharpCorners}
                onCheckedChange={(checked) =>
                  onToggleSkeletonAddon(item.id, 'sharp_corners', !!checked)
                }
              />
              <span>
                Ostré rohy{' '}
                <span className="text-muted-foreground">
                  (+{formatPrice(skeletonInfo.sharpCornersPrice)})
                </span>
              </span>
            </label>
          )}
          {/* 8mm thickness */}
          {skeletonInfo.thickness8mmAddon && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={skeletonInfo.hasThickness8mm}
                onCheckedChange={(checked) =>
                  onToggleSkeletonAddon(item.id, '8mm', !!checked)
                }
              />
              <span>
                8mm materiál{' '}
                <span className="text-muted-foreground">
                  (+{formatPrice(skeletonInfo.thickness8mmPrice)})
                </span>
              </span>
            </label>
          )}
        </div>
      )}
      {/* Set addons inline toggles */}
      {setInfo && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
          <span className="text-sm text-muted-foreground">Doplňky:</span>
          {setInfo.addons.map((addon) => (
            <label key={addon.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={setInfo.activeAddonIds.has(addon.id)}
                onCheckedChange={(checked) =>
                  onToggleSetAddon(item.id, addon, !!checked)
                }
              />
              <span>
                {addon.name}{' '}
                <span className="text-muted-foreground">
                  (+{formatPrice(addon.price)})
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function QuoteEditor({
  quoteNumber,
  products,
  configuration,
  existingQuote,
  existingOrder,
}: QuoteEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [activeVariant, setActiveVariant] = useState<QuoteVariantKey>('ekonomicka')
  const [editingVariantName, setEditingVariantName] = useState<QuoteVariantKey | null>(null)

  // Product groups state
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false)
  const [productGroups, setProductGroups] = useState<ProductGroupWithItems[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  // Prerequisite dialog state
  const [prerequisiteDialogOpen, setPrerequisiteDialogOpen] = useState(false)
  const [prerequisiteCheck, setPrerequisiteCheck] = useState<{
    product: Product
    result: PrerequisiteCheckResult
  } | null>(null)

  // Skeleton addon dialog state
  const [skeletonDialogOpen, setSkeletonDialogOpen] = useState(false)
  const [pendingSkeleton, setPendingSkeleton] = useState<Product | null>(null)
  const [pendingSkeletonDimensions, setPendingSkeletonDimensions] = useState<{
    shape: PoolShape
    dimensions: PoolDimensions
  } | null>(null)

  // Set addon dialog state
  const [setAddonDialogOpen, setSetAddonDialogOpen] = useState(false)
  const [pendingSetProduct, setPendingSetProduct] = useState<Product | null>(null)

  // Pending item ID for combobox-triggered dialogs (skeleton/set/prerequisite)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)

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

  // Customer salutation (vocative)
  const initialName = existingQuote?.customer_name || configuration?.contact_name || ''
  const [customerSalutation, setCustomerSalutation] = useState(
    existingQuote?.customer_salutation || (initialName ? generateSalutation(initialName) : '')
  )
  // Track whether user has manually edited the salutation
  const [salutationManuallyEdited, setSalutationManuallyEdited] = useState(
    !!existingQuote?.customer_salutation
  )

  // Quote details
  const [notes, setNotes] = useState(existingQuote?.notes || '')
  const [validUntil, setValidUntil] = useState(
    existingQuote?.valid_until ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [deliveryTerm, setDeliveryTerm] = useState(existingQuote?.delivery_term || '4-8 týdnů')

  // Urgency / seasonal availability
  const [orderDeadline, setOrderDeadline] = useState(
    existingQuote?.order_deadline ||
      (existingQuote?.valid_until || new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  )
  const [deliveryDeadline, setDeliveryDeadline] = useState(() => {
    if (existingQuote?.delivery_deadline) return existingQuote.delivery_deadline
    const base = new Date(orderDeadline)
    base.setDate(base.getDate() + 42) // 6 weeks
    return base.toISOString().split('T')[0]
  })
  const [capacityMonth, setCapacityMonth] = useState(() => {
    if (existingQuote?.capacity_month) return existingQuote.capacity_month
    const base = new Date(deliveryDeadline)
    return czechMonth(base)
  })
  const [availableInstallations, setAvailableInstallations] = useState(
    existingQuote?.available_installations ?? 3
  )
  const [manualDeliveryDeadline, setManualDeliveryDeadline] = useState(
    !!existingQuote?.delivery_deadline
  )

  // Variants
  const [variants, setVariants] = useState<QuoteVariantState[]>(() => {
    if (existingQuote?.variants && existingQuote.variants.length > 0) {
      return DEFAULT_VARIANTS.map((def) => {
        const existing = existingQuote.variants?.find((v) => v.variant_key === def.key)
        return existing
          ? {
              key: existing.variant_key,
              name: existing.variant_name || def.name,
              discount_percent: existing.discount_percent || 0,
              discount_amount: existing.discount_amount || 0,
            }
          : def
      })
    }
    return DEFAULT_VARIANTS
  })

  // Items with variant associations
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (existingQuote?.items) {
      // Build variant_key map from existing data (for legacy variant_ids support)
      const variantIdToKey: Record<string, QuoteVariantKey> = {}
      existingQuote.variants?.forEach((v) => {
        variantIdToKey[v.id] = v.variant_key
      })

      const loadedItems = existingQuote.items.map((item) => {
        // If variant_keys are already provided directly, use them
        const variant_keys = (item.variant_keys && item.variant_keys.length > 0)
          ? item.variant_keys
          : (item.variant_ids || [])
              .map((id) => variantIdToKey[id])
              .filter(Boolean) as QuoteVariantKey[]

        // Parse set addon info from description prefix [SA:addonId]
        const saMatch = item.description?.match(/^\[SA:([^\]]+)\]/)
        const set_addon_id = saMatch?.[1] || undefined

        return {
          ...item,
          variant_keys,
          set_addon_id,
        }
      })

      // Reconstruct parent_item_id: for items with set_addon_id,
      // find the nearest preceding set item (category 'sety', no set_addon_id)
      let lastSetItemId: string | undefined
      for (const item of loadedItems) {
        if (item.category === 'sety' && !item.set_addon_id) {
          lastSetItemId = item.id
        } else if (item.set_addon_id && lastSetItemId) {
          item.parent_item_id = lastSetItemId
        }
      }

      return loadedItems
    }
    return []
  })

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  // Handle drag end for reordering items
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id)
        const newIndex = prev.findIndex((item) => item.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }, [])

  // Update variant name
  const updateVariantName = useCallback((key: QuoteVariantKey, name: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, name } : v))
    )
  }, [])

  // Update variant discount
  const updateVariantDiscount = useCallback(
    (key: QuoteVariantKey, field: 'discount_percent' | 'discount_amount', value: number) => {
      setVariants((prev) =>
        prev.map((v) => (v.key === key ? { ...v, [field]: value } : v))
      )
    },
    []
  )

  // Get pool shape from configuration for prerequisite checking
  const poolShape = configuration?.pool_shape as PoolShape | undefined

  // Get skeleton addon products
  const skeletonAddons = useMemo(
    () => products.filter((p) => p.tags?.includes('skeleton_addon') && p.active),
    [products]
  )

  // Add multiple products at once (for prerequisites + product)
  const addProductsDirectly = useCallback(
    (productsToAdd: Product[]) => {
      const newItems: QuoteItem[] = productsToAdd.map((product) => ({
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        description: product.description || '',
        category: product.category as QuoteItemCategory,
        quantity: 1,
        unit: product.unit,
        unit_price: product.unit_price,
        total_price: product.unit_price,
        variant_keys: [activeVariant],
      }))
      setItems((prev) => [...newItems, ...prev])
    },
    [activeVariant]
  )

  // Handle adding product with its prerequisites
  const handleAddWithPrerequisites = useCallback(() => {
    if (!prerequisiteCheck) return

    const { product, result } = prerequisiteCheck

    if (pendingItemId) {
      // Combobox flow: update existing item + add prerequisite items
      updateItem(pendingItemId, {
        product_id: product.id,
        name: product.name,
        category: product.category as QuoteItemCategory,
        unit: product.unit,
        unit_price: product.unit_price,
        total_price: product.unit_price * (items.find((i) => i.id === pendingItemId)?.quantity || 1),
      })
      // Add missing prerequisites as new items
      const prerequisiteItems: QuoteItem[] = result.missingPrerequisites.map((p) => ({
        id: crypto.randomUUID(),
        product_id: p.id,
        name: p.name,
        description: p.description || '',
        category: p.category as QuoteItemCategory,
        quantity: 1,
        unit: p.unit,
        unit_price: p.unit_price,
        total_price: p.unit_price,
        variant_keys: [activeVariant],
      }))
      if (prerequisiteItems.length > 0) {
        setItems((prev) => [...prerequisiteItems, ...prev])
      }
      setPendingItemId(null)
      toast.success(`Produkt aktualizován, přidáno ${result.missingPrerequisites.length} prerekvizit`)
    } else {
      // Sidebar/catalog flow: add all as new items
      const allProducts = [...result.missingPrerequisites, product]
      addProductsDirectly(allProducts)
      toast.success(`Přidáno ${allProducts.length} položek včetně prerekvizit`)
    }

    // Close dialog and reset state
    setPrerequisiteDialogOpen(false)
    setPrerequisiteCheck(null)
  }, [prerequisiteCheck, addProductsDirectly, pendingItemId, updateItem, items, activeVariant])

  // Handle skeleton addon dialog confirm - creates single item with addons in name/price
  const handleSkeletonConfirm = useCallback(
    (result: { product: Product; name: string; price: number }) => {
      if (pendingItemId) {
        // Combobox flow: update existing item
        updateItem(pendingItemId, {
          product_id: result.product.id,
          name: result.name,
          category: result.product.category as QuoteItemCategory,
          unit: result.product.unit,
          unit_price: result.price,
          total_price: result.price * (items.find((i) => i.id === pendingItemId)?.quantity || 1),
        })
        setPendingItemId(null)
        toast.success('Skelet aktualizován')
      } else {
        // Catalog/group flow: add new item
        const newItem: QuoteItem = {
          id: crypto.randomUUID(),
          product_id: result.product.id,
          name: result.name,
          description: result.product.description || '',
          category: result.product.category as QuoteItemCategory,
          quantity: 1,
          unit: result.product.unit,
          unit_price: result.price,
          total_price: result.price,
          variant_keys: [activeVariant],
        }
        setItems((prev) => [newItem, ...prev])
        toast.success('Skelet přidán do nabídky')
      }

      setSkeletonDialogOpen(false)
      setPendingSkeleton(null)
      setPendingSkeletonDimensions(null)
    },
    [activeVariant, pendingItemId, updateItem, items]
  )

  // Handle set addon dialog confirm - creates set item + addon items as separate rows
  const handleSetAddonConfirm = useCallback(
    (result: SetAddonResult) => {
      if (pendingItemId) {
        // Combobox flow: update existing item + replace its children
        const existingItem = items.find((i) => i.id === pendingItemId)

        // Update the existing parent item
        updateItem(pendingItemId, {
          product_id: result.setItem.product.id,
          name: result.setItem.name,
          category: result.setItem.product.category as QuoteItemCategory,
          unit: result.setItem.product.unit,
          unit_price: result.setItem.price,
          total_price: result.setItem.price * (existingItem?.quantity || 1),
        })

        // Remove old children, add new addon children
        const addonItems: QuoteItem[] = result.addonItems.map((addon) => ({
          id: crypto.randomUUID(),
          product_id: result.setItem.product.id,
          name: addon.name,
          description: `[SA:${addon.addonId}]`,
          category: 'sety' as QuoteItemCategory,
          quantity: 1,
          unit: 'ks',
          unit_price: addon.price,
          total_price: addon.price,
          variant_keys: existingItem?.variant_keys || [activeVariant],
          parent_item_id: pendingItemId,
          set_addon_id: addon.addonId,
        }))

        setItems((prev) => {
          // Remove old set addon children of this item
          const withoutOldChildren = prev.filter(
            (i) => i.parent_item_id !== pendingItemId
          )
          // Insert new addon items after the parent
          const parentIdx = withoutOldChildren.findIndex((i) => i.id === pendingItemId)
          if (parentIdx < 0) return [...withoutOldChildren, ...addonItems]
          const result2 = [...withoutOldChildren]
          result2.splice(parentIdx + 1, 0, ...addonItems)
          return result2
        })

        setPendingItemId(null)
        toast.success('Set aktualizován')
      } else {
        // Catalog/group flow: add new items
        const setItemId = crypto.randomUUID()

        const setItem: QuoteItem = {
          id: setItemId,
          product_id: result.setItem.product.id,
          name: result.setItem.name,
          description: result.setItem.product.description || '',
          category: result.setItem.product.category as QuoteItemCategory,
          quantity: 1,
          unit: result.setItem.product.unit,
          unit_price: result.setItem.price,
          total_price: result.setItem.price,
          variant_keys: [activeVariant],
        }

        const addonItems: QuoteItem[] = result.addonItems.map((addon) => ({
          id: crypto.randomUUID(),
          product_id: result.setItem.product.id,
          name: addon.name,
          description: `[SA:${addon.addonId}]`,
          category: 'sety' as QuoteItemCategory,
          quantity: 1,
          unit: 'ks',
          unit_price: addon.price,
          total_price: addon.price,
          variant_keys: [activeVariant],
          parent_item_id: setItemId,
          set_addon_id: addon.addonId,
        }))

        setItems((prev) => [setItem, ...addonItems, ...prev])
        toast.success('Set přidán do nabídky')
      }

      setSetAddonDialogOpen(false)
      setPendingSetProduct(null)
    },
    [activeVariant, pendingItemId, updateItem, items]
  )

  // Add custom item to active variant (at the beginning)
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
      variant_keys: [activeVariant],
    }
    setItems((prev) => [newItem, ...prev])
  }, [activeVariant])

  // Fetch product groups
  const fetchProductGroups = useCallback(async () => {
    setLoadingGroups(true)
    try {
      const response = await fetch('/api/admin/product-groups?active=true')
      if (response.ok) {
        const data = await response.json()
        setProductGroups(data.groups || [])
      }
    } catch (err) {
      console.error('Error fetching product groups:', err)
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  // Auto-recalculate urgency fields when orderDeadline changes
  useEffect(() => {
    if (!manualDeliveryDeadline) {
      const base = new Date(orderDeadline)
      if (!isNaN(base.getTime())) {
        base.setDate(base.getDate() + 42) // 6 weeks
        const dd = base.toISOString().split('T')[0]
        setDeliveryDeadline(dd)
        setCapacityMonth(czechMonth(base))
      }
    }
  }, [orderDeadline, manualDeliveryDeadline])

  // Update capacity_month when deliveryDeadline changes manually
  useEffect(() => {
    if (manualDeliveryDeadline) {
      const d = new Date(deliveryDeadline)
      if (!isNaN(d.getTime())) {
        setCapacityMonth(czechMonth(d))
      }
    }
  }, [deliveryDeadline, manualDeliveryDeadline])

  // Sync orderDeadline with validUntil when validUntil changes (unless already edited)
  useEffect(() => {
    if (!existingQuote?.order_deadline) {
      setOrderDeadline(validUntil)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validUntil])

  // Load groups when dialog opens
  useEffect(() => {
    if (groupsDialogOpen && productGroups.length === 0) {
      fetchProductGroups()
    }
  }, [groupsDialogOpen, productGroups.length, fetchProductGroups])

  // Add product group to active variant
  const addProductGroup = useCallback(
    (group: ProductGroupWithItems) => {
      if (!group.items || group.items.length === 0) {
        toast.error('Skupina neobsahuje žádné produkty')
        return
      }

      const newItems: QuoteItem[] = group.items.map((item) => ({
        id: crypto.randomUUID(),
        product_id: item.product?.id || null,
        name: item.product?.name || 'Neznámý produkt',
        description: item.product?.description || '',
        category: (item.product?.category || 'jine') as QuoteItemCategory,
        quantity: item.quantity,
        unit: item.product?.unit || 'ks',
        unit_price: item.product?.unit_price || 0,
        total_price: (item.product?.unit_price || 0) * item.quantity,
        variant_keys: [activeVariant],
      }))

      setItems((prev) => [...newItems, ...prev])
      setGroupsDialogOpen(false)
      toast.success(`Přidáno ${newItems.length} položek ze skupiny "${group.name}"`)
    },
    [activeVariant]
  )

  // Select product for an existing item (combobox flow)
  const selectProductForItem = useCallback(
    (itemId: string, product: Product) => {
      // Skeleton with addons → open dialog
      if (product.category === 'skelety' && skeletonAddons.length > 0) {
        const parsed = parseSkeletonCode(product.code)
        if (parsed) {
          setPendingItemId(itemId)
          setPendingSkeleton(product)
          setPendingSkeletonDimensions({
            shape: parsed.shape,
            dimensions: parsed.dimensions,
          })
          setSkeletonDialogOpen(true)
          return
        }
      }

      // Set with addons → open dialog
      if (product.category === 'sety' && product.set_addons && product.set_addons.length > 0) {
        setPendingItemId(itemId)
        setPendingSetProduct(product)
        setSetAddonDialogOpen(true)
        return
      }

      // Check prerequisites
      const currentQuoteItems = items.map((item) => ({
        ...item,
        id: item.id,
        created_at: '',
        quote_id: '',
        sort_order: 0,
      }))

      const result = checkProductPrerequisites(
        product,
        currentQuoteItems,
        poolShape,
        products
      )

      if (!result.canAdd) {
        setPendingItemId(itemId)
        setPrerequisiteCheck({ product, result })
        setPrerequisiteDialogOpen(true)
        return
      }

      // Direct update - no dialogs needed
      updateItem(itemId, {
        product_id: product.id,
        name: product.name,
        category: product.category as QuoteItemCategory,
        unit: product.unit,
        unit_price: product.unit_price,
        total_price: product.unit_price * (items.find((i) => i.id === itemId)?.quantity || 1),
      })
    },
    [items, poolShape, products, skeletonAddons, updateItem]
  )

  // Toggle item variant association
  const toggleItemVariant = useCallback((itemId: string, variantKey: QuoteVariantKey) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const hasVariant = item.variant_keys.includes(variantKey)
        return {
          ...item,
          variant_keys: hasVariant
            ? item.variant_keys.filter((k) => k !== variantKey)
            : [...item.variant_keys, variantKey],
        }
      })
    )
  }, [])

  // Remove item (cascade delete set addon children)
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id && item.parent_item_id !== id))
  }, [])

  // Toggle skeleton addon - modifies skeleton item's name and price directly
  const onToggleSkeletonAddon = useCallback(
    (skeletonItemId: string, addonType: 'sharp_corners' | '8mm', checked: boolean) => {
      // Find the skeleton item
      const skeletonItem = items.find((i) => i.id === skeletonItemId)
      if (!skeletonItem) return

      // Get base product to calculate prices
      const baseProduct = skeletonItem.product_id
        ? products.find((p) => p.id === skeletonItem.product_id)
        : null

      // Parse dimensions from product code or item name
      const parsed = (baseProduct ? parseSkeletonCode(baseProduct.code) : null) ||
        (() => {
          const rectMatch = skeletonItem.name.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/i)
          if (rectMatch) {
            return {
              shape: 'rectangle_rounded' as PoolShape,
              dimensions: {
                width: parseFloat(rectMatch[1].replace(',', '.')),
                length: parseFloat(rectMatch[2].replace(',', '.')),
                depth: parseFloat(rectMatch[3].replace(',', '.')),
              }
            }
          }
          const circleMatch = skeletonItem.name.match(/(\d+(?:[.,]\d+)?)\s*m?\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*m?/i)
          if (circleMatch && skeletonItem.name.toLowerCase().includes('kruh')) {
            return {
              shape: 'circle' as PoolShape,
              dimensions: {
                diameter: parseFloat(circleMatch[1].replace(',', '.')),
                depth: parseFloat(circleMatch[2].replace(',', '.')),
              }
            }
          }
          return null
        })()

      if (!parsed) return

      const isCircle = parsed.shape === 'circle'
      const baseSkeletonPrice = baseProduct?.unit_price ?? skeletonItem.unit_price

      // Calculate addon prices
      const sharpCornersPrice = Math.round(baseSkeletonPrice * (SHARP_CORNERS_PERCENTAGE / 100))
      const poolSurface = calculatePoolSurface(parsed.shape, parsed.dimensions)
      const thickness8mmPrice = Math.round(poolSurface * THICKNESS_8MM_PRICE_PER_M2)

      // Current addon state (from item name)
      const itemNameLower = skeletonItem.name.toLowerCase()
      const hasSharpCorners = itemNameLower.includes('ostré rohy')
      const has8mm = itemNameLower.includes('8mm')

      // Helper to build addon suffix
      const buildAddonSuffix = (sharpCorners: boolean, mm8: boolean): string => {
        const addons: string[] = []
        if (sharpCorners) addons.push('ostré rohy')
        if (mm8) addons.push('8mm')
        return addons.length > 0 ? ` (${addons.join(', ')})` : ''
      }

      // Helper to get base name (without addon suffix)
      const getBaseName = (name: string): string => {
        return name.replace(/\s*\([^)]*ostré rohy[^)]*\)\s*$/, '').replace(/\s*\([^)]*8mm[^)]*\)\s*$/, '').trim()
      }

      // Calculate new state
      let newSharpCorners = hasSharpCorners
      let new8mm = has8mm

      if (addonType === 'sharp_corners') {
        newSharpCorners = checked
        // If removing sharp corners, also remove 8mm (for rectangles)
        if (!checked && !isCircle) {
          new8mm = false
        }
      } else if (addonType === '8mm') {
        new8mm = checked
        // If adding 8mm and not a circle, also add sharp corners
        if (checked && !isCircle && !hasSharpCorners) {
          newSharpCorners = true
        }
      }

      // Calculate new price
      let newPrice = baseSkeletonPrice
      if (newSharpCorners) newPrice += sharpCornersPrice
      if (new8mm) newPrice += thickness8mmPrice

      // Build new name
      const baseName = getBaseName(skeletonItem.name)
      const newName = baseName + buildAddonSuffix(newSharpCorners, new8mm)

      // Update the item
      setItems((prev) =>
        prev.map((item) =>
          item.id === skeletonItemId
            ? {
                ...item,
                name: newName,
                unit_price: newPrice,
                total_price: newPrice * item.quantity,
              }
            : item
        )
      )

      // Show appropriate toast
      if (addonType === 'sharp_corners') {
        if (checked) {
          toast.success('Přidány ostré rohy')
        } else if (!isCircle && has8mm) {
          toast.success('Odebrány ostré rohy a 8mm materiál')
        } else {
          toast.success('Odebrány ostré rohy')
        }
      } else {
        if (checked) {
          if (!isCircle && !hasSharpCorners) {
            toast.success('Přidán 8mm materiál a ostré rohy')
          } else {
            toast.success('Přidán 8mm materiál')
          }
        } else {
          toast.success('Odebrán 8mm materiál')
        }
      }
    },
    [items, products]
  )

  // Toggle set addon - adds/removes addon as a separate item
  const onToggleSetAddon = useCallback(
    (setItemId: string, addon: SetAddon, checked: boolean) => {
      if (checked) {
        // Add addon item right after the set and its existing addons
        const newAddonItem: QuoteItem = {
          id: crypto.randomUUID(),
          product_id: items.find((i) => i.id === setItemId)?.product_id || null,
          name: addon.name,
          description: `[SA:${addon.id}]`,
          category: 'sety' as QuoteItemCategory,
          quantity: 1,
          unit: 'ks',
          unit_price: addon.price,
          total_price: addon.price,
          variant_keys: items.find((i) => i.id === setItemId)?.variant_keys || [activeVariant],
          parent_item_id: setItemId,
          set_addon_id: addon.id,
        }

        setItems((prev) => {
          // Find the set item index
          const setIdx = prev.findIndex((i) => i.id === setItemId)
          if (setIdx < 0) return prev

          // Find the last addon of this set
          let insertIdx = setIdx + 1
          while (insertIdx < prev.length && prev[insertIdx].parent_item_id === setItemId) {
            insertIdx++
          }

          const next = [...prev]
          next.splice(insertIdx, 0, newAddonItem)
          return next
        })

        toast.success(`Přidán příplatek: ${addon.name}`)
      } else {
        // Remove addon item
        setItems((prev) =>
          prev.filter(
            (i) => !(i.parent_item_id === setItemId && i.set_addon_id === addon.id)
          )
        )
        toast.success(`Odebrán příplatek: ${addon.name}`)
      }
    },
    [items, activeVariant]
  )

  // Generate items from configuration for active variant
  const generateItems = useCallback(async () => {
    if (!configuration?.id) return

    setGenerating(true)
    try {
      const response = await fetch('/api/admin/quotes/generate-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurationId: configuration.id }),
      })

      if (response.ok) {
        const data = await response.json()
        const generatedItems: GeneratedQuoteItem[] = data.items

        setItems((prev) => {
          // Create a map of existing items by product_id for quick lookup
          const existingByProductId = new Map<string, QuoteItem>()
          const existingByName = new Map<string, QuoteItem>()

          for (const item of prev) {
            if (item.product_id) {
              existingByProductId.set(item.product_id, item)
            }
            // Also map by name for items without product_id
            existingByName.set(item.name.toLowerCase().trim(), item)
          }

          // Track which existing items were matched (to add variant)
          const matchedIds = new Set<string>()
          const newItems: QuoteItem[] = []

          for (const genItem of generatedItems) {
            // Try to find existing item by product_id first, then by name
            let existingItem: QuoteItem | undefined
            if (genItem.product_id) {
              existingItem = existingByProductId.get(genItem.product_id)
            }
            if (!existingItem) {
              existingItem = existingByName.get(genItem.name.toLowerCase().trim())
            }

            if (existingItem) {
              // Item exists - mark it to add variant
              matchedIds.add(existingItem.id)
            } else {
              // New item - create it
              newItems.push({
                id: crypto.randomUUID(),
                product_id: genItem.product_id,
                name: genItem.name,
                description: genItem.description || '',
                category: genItem.category,
                quantity: genItem.quantity,
                unit: genItem.unit,
                unit_price: genItem.unit_price,
                total_price: genItem.total_price,
                variant_keys: [activeVariant],
              })
            }
          }

          // Update existing items: add activeVariant to matched items
          const updatedItems = prev.map((item) => {
            if (matchedIds.has(item.id)) {
              // Add variant if not already present
              if (!item.variant_keys.includes(activeVariant)) {
                return {
                  ...item,
                  variant_keys: [...item.variant_keys, activeVariant],
                }
              }
            }
            return item
          })

          return [...updatedItems, ...newItems]
        })
        setHasGenerated(true)
      } else {
        const error = await response.json()
        console.error('Generate error:', error)
      }
    } catch (err) {
      console.error('Generate error:', err)
    } finally {
      setGenerating(false)
    }
  }, [configuration?.id, activeVariant])

  // Auto-generate items for new quotes with configuration
  useEffect(() => {
    if (configuration?.id && !existingQuote && !hasGenerated && items.length === 0) {
      generateItems()
    }
  }, [configuration?.id, existingQuote, hasGenerated, items.length, generateItems])

  // Get items for a specific variant
  const getVariantItems = useCallback(
    (variantKey: QuoteVariantKey) => {
      return items.filter((item) => item.variant_keys.includes(variantKey))
    },
    [items]
  )

  // Calculate subtotal for a variant
  const calculateVariantSubtotal = useCallback(
    (variantKey: QuoteVariantKey) => {
      return getVariantItems(variantKey).reduce((sum, item) => sum + item.total_price, 0)
    },
    [getVariantItems]
  )

  // Calculate total for a variant (after discounts)
  const calculateVariantTotal = useCallback(
    (variantKey: QuoteVariantKey) => {
      const variant = variants.find((v) => v.key === variantKey)
      if (!variant) return 0
      const subtotal = calculateVariantSubtotal(variantKey)
      const percentDiscount = subtotal * (variant.discount_percent / 100)
      return Math.max(0, subtotal - percentDiscount - variant.discount_amount)
    },
    [variants, calculateVariantSubtotal]
  )

  // Items for current active variant
  const activeVariantItems = useMemo(
    () => getVariantItems(activeVariant),
    [getVariantItems, activeVariant]
  )

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Validate items before save
  const validateItems = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Check for items with empty names
    const emptyNameItems = items.filter((item) => !item.name || item.name.trim() === '')
    if (emptyNameItems.length > 0) {
      const categories = emptyNameItems
        .map((item) => CATEGORY_LABELS[item.category] || item.category)
        .slice(0, 3)
        .join(', ')
      errors.push(`${emptyNameItems.length} položek má prázdný název (kategorie: ${categories})`)
    }

    // Check for items with zero or negative prices
    const invalidPriceItems = items.filter((item) => item.unit_price < 0 || item.total_price < 0)
    if (invalidPriceItems.length > 0) {
      const itemNames = invalidPriceItems
        .map((item) => item.name || '(bez názvu)')
        .slice(0, 3)
        .join(', ')
      errors.push(`${invalidPriceItems.length} položek má zápornou cenu: ${itemNames}`)
    }

    // Check for items with zero quantity
    const zeroQuantityItems = items.filter((item) => item.quantity <= 0)
    if (zeroQuantityItems.length > 0) {
      const itemNames = zeroQuantityItems
        .map((item) => item.name || '(bez názvu)')
        .slice(0, 3)
        .join(', ')
      errors.push(`${zeroQuantityItems.length} položek má nulové nebo záporné množství: ${itemNames}`)
    }

    // Check for items not assigned to any variant
    const orphanItems = items.filter((item) => item.variant_keys.length === 0)
    if (orphanItems.length > 0) {
      const itemNames = orphanItems
        .map((item) => item.name || '(bez názvu)')
        .slice(0, 5) // Show max 5 items
        .join(', ')
      const moreText = orphanItems.length > 5 ? ` a ${orphanItems.length - 5} dalších` : ''
      errors.push(`${orphanItems.length} položek není přiřazeno k žádné variantě: ${itemNames}${moreText}`)
    }

    return { valid: errors.length === 0, errors }
  }, [items])

  // Reusable save logic — returns quote ID on success, null on failure
  const saveQuote = async (): Promise<string | null> => {
    if (!customerName.trim()) {
      toast.error('Vyplňte jméno zákazníka')
      return null
    }

    const hasAnyItems = variants.some((v) => getVariantItems(v.key).length > 0)
    if (!hasAnyItems) {
      toast.error('Přidejte alespoň jednu položku do některé varianty')
      return null
    }

    const validation = validateItems()
    if (!validation.valid) {
      toast.error('Nelze uložit nabídku', {
        description: validation.errors.join('\n'),
        duration: 8000,
      })
      return null
    }

    const variantsWithItems = variants.filter((v) => getVariantItems(v.key).length > 0)

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
        customer_salutation: customerSalutation || null,
        pool_config: configuration
          ? {
              shape: configuration.pool_shape,
              type: configuration.pool_type,
              dimensions: configuration.dimensions,
              color: configuration.color,
              stairs: configuration.stairs,
              technology: configuration.technology,
              lighting: configuration.lighting,
              counterflow: configuration.counterflow,
              waterTreatment: configuration.water_treatment,
              heating: configuration.heating,
              roofing: configuration.roofing,
            }
          : null,
        valid_until: validUntil,
        delivery_term: deliveryTerm,
        notes,
        order_deadline: orderDeadline || null,
        delivery_deadline: deliveryDeadline || null,
        capacity_month: capacityMonth || null,
        available_installations: availableInstallations || null,
        variants: variantsWithItems.map((v, idx) => ({
          variant_key: v.key,
          variant_name: v.name,
          sort_order: idx,
          discount_percent: v.discount_percent,
          discount_amount: v.discount_amount,
        })),
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
          variant_keys: item.variant_keys,
        })),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.id as string
    } else {
      const error = await response.json()
      console.error('Save error:', error)
      toast.error(error.error || 'Chyba při ukládání')
      return null
    }
  }

  // Save quote
  const handleSave = async () => {
    setSaving(true)
    try {
      const quoteId = await saveQuote()
      if (quoteId) {
        toast.success('Nabídka uložena')
        router.push(`/admin/nabidky/${quoteId}`)
      }
    } catch (err) {
      console.error('Connection error:', err)
      toast.error('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  // Save and download PDF
  const handleSaveAndDownloadPdf = async () => {
    setSaving(true)
    try {
      const quoteId = await saveQuote()
      if (quoteId) {
        toast.success('Nabídka uložena, stahuji PDF...')
        window.open(`/api/admin/quotes/${quoteId}/pdf`, '_blank')
        router.push(`/admin/nabidky/${quoteId}`)
      }
    } catch (err) {
      console.error('Connection error:', err)
      toast.error('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  // Save quote and sync items to existing order
  const handleSaveAndSyncOrder = async () => {
    if (!existingOrder) return

    setSaving(true)
    try {
      const quoteId = await saveQuote()
      if (!quoteId) return

      const syncResponse = await fetch(`/api/admin/quotes/${quoteId}/sync-order`, {
        method: 'POST',
      })

      if (syncResponse.ok) {
        const data = await syncResponse.json()
        toast.success(`Objednávka ${data.orderNumber} aktualizována`)
        router.push(`/admin/nabidky/${quoteId}`)
      } else {
        const error = await syncResponse.json().catch(() => ({}))
        toast.error(error.error || 'Nepodařilo se aktualizovat objednávku')
      }
    } catch (err) {
      console.error('Sync order error:', err)
      toast.error('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sticky header with actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Nabídka {quoteNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
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
              onClick={handleSaveAndDownloadPdf}
              disabled={saving || !customerName.trim()}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Uložit a stáhnout PDF
            </Button>
            {existingOrder && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={saving || !customerName.trim()}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Uložit a aktualizovat objednávku
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Aktualizovat objednávku {existingOrder.order_number}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Položky a ceny objednávky budou přepsány aktuálními položkami z nabídky.
                      Smluvní údaje (záloha, doprava, DPH, adresy) zůstanou beze změny.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveAndSyncOrder}>
                      Aktualizovat objednávku
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Customer info + Seasonal availability side by side */}
      <div className="grid grid-cols-2 gap-6">
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
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (!salutationManuallyEdited && e.target.value.trim()) {
                    setCustomerSalutation(generateSalutation(e.target.value))
                  }
                }}
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="salutation">Oslovení zákazníka</Label>
              <Input
                id="salutation"
                value={customerSalutation}
                onChange={(e) => {
                  setCustomerSalutation(e.target.value)
                  setSalutationManuallyEdited(true)
                }}
                placeholder="Vážený pane Nováku"
              />
              <p className="text-xs text-muted-foreground">
                Automaticky vygenerováno z jména, můžete upravit
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Urgency / Seasonal availability */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Sezónní dostupnost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_deadline">Objednat do</Label>
                <Input
                  id="order_deadline"
                  type="date"
                  value={orderDeadline}
                  onChange={(e) => setOrderDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_deadline">Dodání do</Label>
                <Input
                  id="delivery_deadline"
                  type="date"
                  value={deliveryDeadline}
                  onChange={(e) => {
                    setManualDeliveryDeadline(true)
                    setDeliveryDeadline(e.target.value)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Měsíc kapacity</Label>
                <div className="flex gap-2">
                  <Select
                    value={capacityMonth.split(' ')[0] || ''}
                    onValueChange={(month) => {
                      const year = capacityMonth.split(' ')[1] || new Date().getFullYear().toString()
                      setCapacityMonth(`${month} ${year}`)
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Měsíc" />
                    </SelectTrigger>
                    <SelectContent>
                      {CZECH_MONTHS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={capacityMonth.split(' ')[1] || ''}
                    onValueChange={(year) => {
                      const month = capacityMonth.split(' ')[0] || CZECH_MONTHS[0]
                      setCapacityMonth(`${month} ${year}`)
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Rok" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="available_installations">Volné montáže</Label>
                <Input
                  id="available_installations"
                  type="number"
                  min={0}
                  value={availableInstallations}
                  onChange={(e) => setAvailableInstallations(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Zobrazí se na PDF v urgency banneru. Výchozí hodnoty se počítají z platnosti nabídky.
            </p>
          </CardContent>
        </Card>
      </div>

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

        {/* Quote variants with tabs */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Varianty nabídky</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={activeVariant} onValueChange={(v) => setActiveVariant(v as QuoteVariantKey)}>
              <div className="border-b mb-6">
                <div className="flex">
                  {variants.map((variant, index) => {
                    const itemCount = getVariantItems(variant.key).length
                    const total = calculateVariantTotal(variant.key)
                    const isActive = activeVariant === variant.key
                    const isEmpty = itemCount === 0
                    return (
                      <button
                        key={variant.key}
                        onClick={() => setActiveVariant(variant.key)}
                        className={`
                          flex-1 px-4 py-3 text-center transition-all relative
                          ${isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground/80'
                          }
                          ${index > 0 ? 'border-l border-border/50' : ''}
                        `}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                            {variant.name}
                          </span>
                          <span className={`text-xs ${isEmpty ? 'text-muted-foreground/60' : ''}`}>
                            {isEmpty ? '—' : formatPrice(total)}
                          </span>
                        </div>
                        {isActive && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {variants.map((variant) => (
                <TabsContent key={variant.key} value={variant.key} className="space-y-4">
                  {/* Variant settings */}
                  <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-[200px] space-y-2">
                      <Label className="text-sm">Název varianty</Label>
                      {editingVariantName === variant.key ? (
                        <div className="flex gap-2">
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariantName(variant.key, e.target.value)}
                            onBlur={() => setEditingVariantName(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingVariantName(null)}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingVariantName(variant.key)}
                          className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                        >
                          <span className="font-medium">{variant.name}</span>
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-sm">Sleva %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={variant.discount_percent}
                        onChange={(e) =>
                          updateVariantDiscount(variant.key, 'discount_percent', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label className="text-sm">Sleva Kč</Label>
                      <Input
                        type="number"
                        min={0}
                        value={variant.discount_amount}
                        onChange={(e) =>
                          updateVariantDiscount(variant.key, 'discount_amount', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  {/* Actions for this variant */}
                  <div className="flex flex-wrap gap-2">
                    {configuration && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateItems}
                        disabled={generating}
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {activeVariantItems.length > 0 ? 'Přegenerovat' : 'Generovat z konfigurace'}
                      </Button>
                    )}
                    <Dialog open={groupsDialogOpen} onOpenChange={setGroupsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Layers className="w-4 h-4 mr-2" />
                          Přidat skupinu
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Vybrat skupinu produktů</DialogTitle>
                          <DialogDescription>
                            Všechny produkty ze skupiny budou přidány do varianty &bdquo;{variants.find((v) => v.key === activeVariant)?.name}&ldquo;
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[50vh] overflow-y-auto">
                          {loadingGroups ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : productGroups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Žádné skupiny produktů</p>
                              <p className="text-sm">Vytvořte je v Nastavení → Produkty → Skupiny</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {productGroups.map((group) => {
                                const itemCount = group.items?.length || 0
                                const totalPrice = (group.items || []).reduce(
                                  (sum, item) => sum + (item.product?.unit_price || 0) * item.quantity,
                                  0
                                )
                                return (
                                  <div
                                    key={group.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                                    onClick={() => addProductGroup(group)}
                                  >
                                    <div>
                                      <div className="font-medium">{group.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {itemCount} {itemCount === 1 ? 'položka' : itemCount < 5 ? 'položky' : 'položek'}
                                        {group.description && ` · ${group.description}`}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">{formatPrice(totalPrice)}</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={addCustomItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Přidat položku
                    </Button>
                  </div>

                  {/* Items list with drag and drop */}
                  <div className="space-y-3">
                    {generating ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Generuji položky z konfigurace...</p>
                      </div>
                    ) : activeVariantItems.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        {configuration
                          ? 'Klikněte na "Generovat" pro automatické vytvoření položek, nebo přidejte vlastní položku.'
                          : 'Zatím žádné položky. Přidejte vlastní položku a začněte psát název pro výběr z katalogu.'}
                      </p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={activeVariantItems.map((item) => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {activeVariantItems.map((item) => (
                            <SortableQuoteItem
                              key={item.id}
                              item={item}
                              items={items}
                              variants={variants}
                              updateItem={updateItem}
                              removeItem={removeItem}
                              toggleItemVariant={toggleItemVariant}
                              formatPrice={formatPrice}
                              skeletonAddons={skeletonAddons}
                              products={products}
                              onToggleSkeletonAddon={onToggleSkeletonAddon}
                              onToggleSetAddon={onToggleSetAddon}
                              onProductSelect={selectProductForItem}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  {/* Variant totals */}
                  {activeVariantItems.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Mezisoučet</span>
                          <span>{formatPrice(calculateVariantSubtotal(variant.key))}</span>
                        </div>
                        {variant.discount_percent > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sleva {variant.discount_percent}%</span>
                            <span className="text-green-600">
                              -{formatPrice(calculateVariantSubtotal(variant.key) * (variant.discount_percent / 100))}
                            </span>
                          </div>
                        )}
                        {variant.discount_amount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sleva</span>
                            <span className="text-green-600">-{formatPrice(variant.discount_amount)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Celkem {variant.name}</span>
                          <span>{formatPrice(calculateVariantTotal(variant.key))}</span>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
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
            <div className="space-y-2">
              <Label htmlFor="delivery_term">Termín dodání</Label>
              <Input
                id="delivery_term"
                value={deliveryTerm}
                onChange={(e) => setDeliveryTerm(e.target.value)}
                placeholder="4-8 týdnů"
              />
            </div>
          </CardContent>
        </Card>

      {/* Prerequisite dialog */}
      <AlertDialog open={prerequisiteDialogOpen} onOpenChange={setPrerequisiteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chybí požadované produkty</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Pro přidání produktu <strong>{prerequisiteCheck?.product.name}</strong> je
                  nutné nejprve přidat:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {prerequisiteCheck?.result.missingPrerequisites.map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong>
                      {p.price_type === 'percentage' && p.price_percentage && (
                        <span className="text-muted-foreground"> (+{p.price_percentage}% z ceny bazénu)</span>
                      )}
                      {p.price_type === 'fixed' && (
                        <span className="text-muted-foreground"> ({formatPrice(p.unit_price)})</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground">
                  Chcete přidat všechny produkty najednou?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPrerequisiteCheck(null); setPendingItemId(null) }}>
              Zrušit
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAddWithPrerequisites}>
              Přidat vše
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Skeleton addon dialog */}
      {pendingSkeletonDimensions && (
        <SkeletonAddonDialog
          open={skeletonDialogOpen}
          onOpenChange={(open) => {
            setSkeletonDialogOpen(open)
            if (!open) {
              setPendingSkeleton(null)
              setPendingSkeletonDimensions(null)
              setPendingItemId(null)
            }
          }}
          skeleton={pendingSkeleton}
          addons={skeletonAddons}
          poolShape={pendingSkeletonDimensions.shape}
          dimensions={pendingSkeletonDimensions.dimensions}
          onConfirm={handleSkeletonConfirm}
        />
      )}

      {/* Set addon dialog */}
      <SetAddonDialog
        open={setAddonDialogOpen}
        onOpenChange={(open) => {
          setSetAddonDialogOpen(open)
          if (!open) {
            setPendingSetProduct(null)
            setPendingItemId(null)
          }
        }}
        product={pendingSetProduct}
        onConfirm={handleSetAddonConfirm}
      />
    </div>
  )
}
