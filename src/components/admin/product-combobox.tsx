'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Link2, X } from 'lucide-react'
import type { Product, QuoteItemCategory } from '@/lib/supabase/types'
import { QUOTE_CATEGORY_LABELS, QUOTE_CATEGORY_ORDER } from '@/lib/constants/categories'

// Normalize search text - replace × with x for dimension matching
function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')
}

// Format price for display
function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

interface ProductComboboxProps {
  value: string
  productId: string | null
  products: Product[]
  onProductSelect: (product: Product) => void
  onNameChange: (name: string) => void
  onClear: () => void
  disabled?: boolean
}

export function ProductCombobox({
  value,
  productId,
  products,
  onProductSelect,
  onNameChange,
  onClear,
  disabled,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<QuoteItemCategory | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Count products per category (for chips)
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<QuoteItemCategory, number>> = {}
    for (const product of products) {
      const cat = product.category as QuoteItemCategory
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [products])

  // Categories that have products
  const availableCategories = useMemo(
    () => QUOTE_CATEGORY_ORDER.filter((cat) => (categoryCounts[cat] || 0) > 0),
    [categoryCounts]
  )

  // Filter products by search and/or active category
  const filteredProducts = useMemo(() => {
    let result = products

    // Apply category filter
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory)
    }

    // Apply search filter
    if (search) {
      const normalizedSearch = normalizeSearchText(search)
      result = result.filter((product) => {
        const normalizedName = normalizeSearchText(product.name)
        const normalizedCode = product.code ? normalizeSearchText(product.code) : ''
        return normalizedName.includes(normalizedSearch) || normalizedCode.includes(normalizedSearch)
      })
    }

    return result
  }, [products, search, activeCategory])

  // Group by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {}
    for (const product of filteredProducts) {
      const cat = product.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(product)
    }
    return grouped
  }, [filteredProducts])

  // Determine if we should show products (search active or category selected)
  const showProducts = search.length > 0 || activeCategory !== null

  const handleSelect = useCallback(
    (product: Product) => {
      onProductSelect(product)
      setOpen(false)
      setSearch('')
      setActiveCategory(null)
    },
    [onProductSelect]
  )

  const handleNameInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onNameChange(newValue)
      // Sync search with typed text and open dropdown for autocomplete
      setSearch(newValue)
      setActiveCategory(null)
      if (newValue.length > 0 && !open) {
        setOpen(true)
      }
    },
    [onNameChange, open]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClear()
    },
    [onClear]
  )

  const handleCategoryClick = useCallback((category: QuoteItemCategory) => {
    setActiveCategory((prev) => (prev === category ? null : category))
    setSearch('')
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen && value && !productId) {
      // Pre-fill search with current name when opening (unlinked item)
      setSearch(value)
      setActiveCategory(null)
    }
    if (!nextOpen) {
      setSearch('')
      setActiveCategory(null)
    }
  }, [value, productId])

  const isLinked = productId !== null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={value}
            onChange={handleNameInputChange}
            onClick={() => setOpen(true)}
            placeholder="Název položky — klikněte pro výběr z katalogu"
            disabled={disabled}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-16"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLinked && (
              <>
                <span className="text-primary" title="Napojeno na produkt z katalogu">
                  <Link2 className="w-3.5 h-3.5" />
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                  title="Odpojit od produktu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Hledat podle názvu nebo kódu..."
            value={search}
            onValueChange={(val) => {
              setSearch(val)
              if (val) setActiveCategory(null)
            }}
          />

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5 px-2 py-2 border-b">
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {QUOTE_CATEGORY_LABELS[category]}
                <span className="opacity-60">{categoryCounts[category]}</span>
              </button>
            ))}
          </div>

          <CommandList className="max-h-[300px]">
            {showProducts ? (
              <>
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  Žádný produkt nenalezen — text bude použit jako vlastní název
                </CommandEmpty>
                {QUOTE_CATEGORY_ORDER.map((category) => {
                  const categoryProducts = productsByCategory[category]
                  if (!categoryProducts || categoryProducts.length === 0) return null
                  return (
                    <CommandGroup
                      key={category}
                      heading={QUOTE_CATEGORY_LABELS[category] || category}
                    >
                      {categoryProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
                          onSelect={() => handleSelect(product)}
                          className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{product.name}</div>
                            {product.code && (
                              <div className="text-xs text-muted-foreground truncate">{product.code}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-medium">{formatPrice(product.unit_price)}</div>
                            <div className="text-xs text-muted-foreground">/ {product.unit}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                })}
              </>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Vyberte kategorii nebo začněte psát pro vyhledání produktu
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
