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
  Package,
  Loader2,
  Sparkles,
  Search,
  Pencil,
  GripVertical,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import type { Product, Configuration, QuoteItemCategory, GeneratedQuoteItem, QuoteVariantKey, ProductGroupWithItems, PoolShape, PoolDimensions } from '@/lib/supabase/types'
import { checkProductPrerequisites, parseSkeletonCode, calculatePoolSurface, type PrerequisiteCheckResult } from '@/lib/pricing'
import { SkeletonAddonDialog } from './skeleton-addon-dialog'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  formatDimensions,
} from '@/lib/constants/configurator'
import { QUOTE_CATEGORY_LABELS, QUOTE_CATEGORY_ORDER } from '@/lib/constants/categories'

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
    notes: string
    valid_until: string
    delivery_term: string | null
    items: (QuoteItem & { variant_ids?: string[] })[]
    variants?: {
      id: string
      variant_key: QuoteVariantKey
      variant_name: string
      discount_percent: number
      discount_amount: number
    }[]
  }
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
  variants: QuoteVariantState[]
  updateItem: (id: string, updates: Partial<QuoteItem>) => void
  removeItem: (id: string) => void
  toggleItemVariant: (itemId: string, variantKey: QuoteVariantKey) => void
  formatPrice: (price: number) => string
  // Skeleton addon props
  skeletonAddons: Product[]
  products: Product[]
  onToggleSkeletonAddon: (skeletonItemId: string, addonType: 'sharp_corners' | '8mm', checked: boolean) => void
}

function SortableQuoteItem({
  item,
  variants,
  updateItem,
  removeItem,
  toggleItemVariant,
  formatPrice,
  skeletonAddons,
  products,
  onToggleSkeletonAddon,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 p-4 rounded-lg border bg-background ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
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
          <Input
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
            placeholder="Název položky"
            className="font-medium"
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
        <div className="flex items-center justify-end font-semibold">
          {formatPrice(item.total_price)}
        </div>
      </div>
      {/* Variant checkboxes */}
      <div className="flex items-center gap-4 pt-2 border-t">
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
    </div>
  )
}

export function QuoteEditor({
  quoteNumber,
  products,
  configuration,
  existingQuote,
}: QuoteEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [activeVariant, setActiveVariant] = useState<QuoteVariantKey>('ekonomicka')
  const [editingVariantName, setEditingVariantName] = useState<QuoteVariantKey | null>(null)

  // Collapsible categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['skelety', 'technologie'])
  )

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
  const [deliveryTerm, setDeliveryTerm] = useState(existingQuote?.delivery_term || '4-8 týdnů')

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

      return existingQuote.items.map((item) => {
        // If variant_keys are already provided directly, use them
        if (item.variant_keys && item.variant_keys.length > 0) {
          return {
            ...item,
            variant_keys: item.variant_keys,
          }
        }
        // Otherwise, map from variant_ids (legacy support)
        return {
          ...item,
          variant_keys: (item.variant_ids || [])
            .map((id) => variantIdToKey[id])
            .filter(Boolean) as QuoteVariantKey[],
        }
      })
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

  // Add single product directly (no prerequisite check)
  const addProductDirectly = useCallback(
    (product: Product) => {
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
        variant_keys: [activeVariant],
      }
      setItems((prev) => [newItem, ...prev])
    },
    [activeVariant]
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

  // Add product to active variant (at the beginning) with prerequisite check
  const addProduct = useCallback(
    (product: Product) => {
      // Check if this is a skeleton product with available addons
      if (product.category === 'skelety' && skeletonAddons.length > 0) {
        const parsed = parseSkeletonCode(product.code)
        if (parsed) {
          // Open skeleton addon dialog
          setPendingSkeleton(product)
          setPendingSkeletonDimensions({
            shape: parsed.shape,
            dimensions: parsed.dimensions,
          })
          setSkeletonDialogOpen(true)
          return
        }
      }

      // Convert current items to QuoteItem format for prerequisite checking
      const currentQuoteItems = items.map((item) => ({
        ...item,
        id: item.id,
        created_at: '',
        quote_id: '',
        sort_order: 0,
      }))

      // Check prerequisites
      const result = checkProductPrerequisites(
        product,
        currentQuoteItems,
        poolShape,
        products
      )

      if (result.canAdd) {
        // No missing prerequisites, add directly
        addProductDirectly(product)
      } else {
        // Missing prerequisites - show dialog
        setPrerequisiteCheck({ product, result })
        setPrerequisiteDialogOpen(true)
      }
    },
    [items, poolShape, products, addProductDirectly, skeletonAddons]
  )

  // Handle adding product with its prerequisites
  const handleAddWithPrerequisites = useCallback(() => {
    if (!prerequisiteCheck) return

    const { product, result } = prerequisiteCheck
    // Add prerequisites first, then the product
    const allProducts = [...result.missingPrerequisites, product]
    addProductsDirectly(allProducts)

    // Close dialog and reset state
    setPrerequisiteDialogOpen(false)
    setPrerequisiteCheck(null)

    toast.success(`Přidáno ${allProducts.length} položek včetně prerekvizit`)
  }, [prerequisiteCheck, addProductsDirectly])

  // Handle skeleton addon dialog confirm - creates single item with addons in name/price
  const handleSkeletonConfirm = useCallback(
    (result: { product: Product; name: string; price: number }) => {
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
      setSkeletonDialogOpen(false)
      setPendingSkeleton(null)
      setPendingSkeletonDimensions(null)

      toast.success('Skelet přidán do nabídky')
    },
    [activeVariant]
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

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
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

  // Save quote
  const handleSave = async () => {
    if (!customerName.trim()) {
      toast.error('Vyplňte jméno zákazníka')
      return
    }

    // Check if at least one variant has items
    const hasAnyItems = variants.some((v) => getVariantItems(v.key).length > 0)
    if (!hasAnyItems) {
      toast.error('Přidejte alespoň jednu položku do některé varianty')
      return
    }

    // Validate items
    const validation = validateItems()
    if (!validation.valid) {
      toast.error('Nelze uložit nabídku', {
        description: validation.errors.join('\n'),
        duration: 8000,
      })
      return
    }

    setSaving(true)

    try {
      // Filter out empty variants
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
        toast.success('Nabídka uložena')
        router.push(`/admin/nabidky/${data.id}`)
      } else {
        const error = await response.json()
        console.error('Save error:', error)
        toast.error(error.error || 'Chyba při ukládání')
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
    if (!customerName.trim()) {
      toast.error('Vyplňte jméno zákazníka')
      return
    }

    const hasAnyItems = variants.some((v) => getVariantItems(v.key).length > 0)
    if (!hasAnyItems) {
      toast.error('Přidejte alespoň jednu položku do některé varianty')
      return
    }

    // Validate items
    const validation = validateItems()
    if (!validation.valid) {
      toast.error('Nelze uložit nabídku', {
        description: validation.errors.join('\n'),
        duration: 8000,
      })
      return
    }

    setSaving(true)

    try {
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
        toast.success('Nabídka uložena, stahuji PDF...')
        window.open(`/api/admin/quotes/${data.id}/pdf`, '_blank')
        router.push(`/admin/nabidky/${data.id}`)
      } else {
        const error = await response.json()
        console.error('Save error:', error)
        toast.error(error.error || 'Chyba při ukládání')
      }
    } catch (err) {
      console.error('Connection error:', err)
      toast.error('Chyba připojení')
    } finally {
      setSaving(false)
    }
  }

  // Category toggle functions
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const expandAllCategories = useCallback(() => {
    setExpandedCategories(new Set(QUOTE_CATEGORY_ORDER))
  }, [])

  const collapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set())
  }, [])

  // Normalize search text - replace × with x for dimension matching
  const normalizeSearchText = (text: string) =>
    text.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')

  // Filter products by search term (name or code)
  const filteredProducts = products.filter((product) => {
    if (!productSearch) return true
    const normalizedSearch = normalizeSearchText(productSearch)
    const normalizedName = normalizeSearchText(product.name)
    const normalizedCode = product.code ? normalizeSearchText(product.code) : ''
    return normalizedName.includes(normalizedSearch) || normalizedCode.includes(normalizedSearch)
  })

  // Group products by category
  const productsByCategory = filteredProducts.reduce(
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
                      Vlastní položka
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
                          ? 'Klikněte na "Generovat" pro automatické vytvoření položek, nebo přidejte produkty z katalogu.'
                          : 'Zatím žádné položky. Přidejte produkty z katalogu vpravo.'}
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
                              variants={variants}
                              updateItem={updateItem}
                              removeItem={removeItem}
                              toggleItemVariant={toggleItemVariant}
                              formatPrice={formatPrice}
                              skeletonAddons={skeletonAddons}
                              products={products}
                              onToggleSkeletonAddon={onToggleSkeletonAddon}
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
      </div>

      {/* Sidebar - Actions and Product catalog */}
      <div className="sticky top-6 h-[calc(100vh-3rem)] flex flex-col gap-4">
        {/* Actions */}
        <Card className="border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
          <CardContent className="pt-4 pb-4 space-y-2">
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
              disabled={saving || !customerName.trim()}
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

        {/* Product catalog */}
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Katalog produktů
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAllCategories}
                  className="text-xs h-7 px-2"
                >
                  Rozbalit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAllCategories}
                  className="text-xs h-7 px-2"
                >
                  Sbalit
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              Přidá do varianty „{variants.find((v) => v.key === activeVariant)?.name}"
            </p>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pt-0">
            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat podle názvu nebo kódu..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search results count */}
            {productSearch && (
              <p className="text-sm text-muted-foreground shrink-0">
                {filteredProducts.length} výsledků
              </p>
            )}

            {/* Categories with Collapsible */}
            <div className="space-y-2 overflow-y-auto flex-1">
              {QUOTE_CATEGORY_ORDER.map((category) => {
                const categoryProducts = productsByCategory[category] || []
                if (categoryProducts.length === 0) return null

                const isExpanded = expandedCategories.has(category)

                return (
                  <Collapsible
                    key={category}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-2 h-auto hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? 'rotate-0' : '-rotate-90'
                            }`}
                          />
                          <span className="font-medium text-sm">
                            {CATEGORY_LABELS[category] || category}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {categoryProducts.length}
                          </Badge>
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-1 pt-1">
                      {categoryProducts.map((product) => (
                        <div
                          key={product.id}
                          className="group flex items-start justify-between p-2 pl-8 rounded hover:bg-muted/80 cursor-pointer border border-transparent hover:border-border"
                          onClick={() => addProduct(product)}
                        >
                          <div className="flex-1 min-w-0 text-sm pr-2">
                            <div className="font-medium leading-tight">{product.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatPrice(product.unit_price)} / {product.unit}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              addProduct(product)
                            }}
                            title="Přidat do nabídky"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}

              {products.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Žádné produkty. Synchronizujte z Pipedrive.
                </p>
              )}

              {products.length > 0 && filteredProducts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Žádné produkty neodpovídají vyhledávání.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
            <AlertDialogCancel onClick={() => setPrerequisiteCheck(null)}>
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
            }
          }}
          skeleton={pendingSkeleton}
          addons={skeletonAddons}
          poolShape={pendingSkeletonDimensions.shape}
          dimensions={pendingSkeletonDimensions.dimensions}
          onConfirm={handleSkeletonConfirm}
        />
      )}
    </div>
  )
}
