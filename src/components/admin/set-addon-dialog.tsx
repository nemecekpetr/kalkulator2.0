'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import type { Product } from '@/lib/supabase/types'

export interface SetAddonResult {
  setItem: { product: Product; name: string; price: number }
  addonItems: { addonId: string; name: string; price: number }[]
}

interface SetAddonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onConfirm: (result: SetAddonResult) => void
}

export function SetAddonDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
}: SetAddonDialogProps) {
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set())

  // Reset selection when dialog opens - use onOpenChange callback instead of effect
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setSelectedAddonIds(new Set())
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const addons = useMemo(
    () =>
      (product?.set_addons || [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [product?.set_addons]
  )

  const toggleAddon = useCallback((addonId: string) => {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev)
      if (next.has(addonId)) {
        next.delete(addonId)
      } else {
        next.add(addonId)
      }
      return next
    })
  }, [])

  const selectedAddons = useMemo(
    () => addons.filter((a) => selectedAddonIds.has(a.id)),
    [addons, selectedAddonIds]
  )

  const addonTotal = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + a.price, 0),
    [selectedAddons]
  )

  const handleConfirm = useCallback(() => {
    if (!product) return

    onConfirm({
      setItem: {
        product,
        name: product.name,
        price: product.unit_price,
      },
      addonItems: selectedAddons.map((a) => ({
        addonId: a.id,
        name: a.name,
        price: a.price,
      })),
    })
  }, [product, selectedAddons, onConfirm])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat set s příplatky</DialogTitle>
          <DialogDescription>
            Vyberte volitelné příplatky pro tento bazénový set
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Set info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="font-medium">{product.name}</div>
            {product.code && (
              <div className="text-sm text-muted-foreground">
                Kód: {product.code}
              </div>
            )}
            <div className="text-sm font-medium mt-1">
              Základní cena: {formatPrice(product.unit_price)}
            </div>
          </div>

          {addons.length > 0 && (
            <>
              <Separator />

              {/* Addon checkboxes */}
              <div className="space-y-2">
                {addons.map((addon) => {
                  const isSelected = selectedAddonIds.has(addon.id)
                  return (
                    <label
                      key={addon.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAddon(addon.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{addon.name}</div>
                          {addon.description && (
                            <div className="text-xs text-muted-foreground">
                              {addon.description}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium whitespace-nowrap ml-2">
                          +{formatPrice(addon.price)}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          <Separator />

          {/* Total */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Set</span>
              <span>{formatPrice(product.unit_price)}</span>
            </div>
            {addonTotal > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Příplatky ({selectedAddons.length})</span>
                <span>+{formatPrice(addonTotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Celkem</span>
              <span>{formatPrice(product.unit_price + addonTotal)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleConfirm}>Přidat do nabídky</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
