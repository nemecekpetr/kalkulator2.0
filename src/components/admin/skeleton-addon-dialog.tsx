'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
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
import { AlertTriangle } from 'lucide-react'
import type { Product, PoolShape, PoolDimensions } from '@/lib/supabase/types'
import { calculatePoolSurface, formatPoolSurface } from '@/lib/pricing'

// Addon product codes
const SHARP_CORNERS_CODE = 'PRIPLATEK-OSTRE-ROHY'
const THICKNESS_8MM_CODE = 'PRIPLATEK-8MM'

// Price constants
const SHARP_CORNERS_PERCENTAGE = 10 // 10% of skeleton price
const THICKNESS_8MM_PRICE_PER_M2 = 650 // 650 Kč/m²

interface SkeletonAddonItem {
  product: Product
  price: number
  checked: boolean
  disabled: boolean
  disabledReason?: string
}

interface SkeletonAddonResult {
  product: Product
  name: string  // Modified name with addons suffix
  price: number // Total price including addons
}

interface SkeletonAddonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skeleton: Product | null
  addons: Product[]
  poolShape: PoolShape
  dimensions: PoolDimensions
  onConfirm: (result: SkeletonAddonResult) => void
}

export function SkeletonAddonDialog({
  open,
  onOpenChange,
  skeleton,
  addons,
  poolShape,
  dimensions,
  onConfirm,
}: SkeletonAddonDialogProps) {
  // Find specific addon products
  const sharpCornersAddon = useMemo(
    () => addons.find((p) => p.code === SHARP_CORNERS_CODE),
    [addons]
  )

  const thickness8mmAddon = useMemo(
    () => addons.find((p) => p.code === THICKNESS_8MM_CODE),
    [addons]
  )

  // Calculate prices
  const skeletonPrice = skeleton?.unit_price ?? 0
  const poolSurface = useMemo(
    () => calculatePoolSurface(poolShape, dimensions),
    [poolShape, dimensions]
  )

  const sharpCornersPrice = Math.round(skeletonPrice * (SHARP_CORNERS_PERCENTAGE / 100))
  const thickness8mmPrice = Math.round(poolSurface * THICKNESS_8MM_PRICE_PER_M2)

  // Addon selection state
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set())

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on dialog open
      setSelectedAddons(new Set())
    }
  }, [open])

  // Check if sharp corners is selected
  const sharpCornersSelected = sharpCornersAddon
    ? selectedAddons.has(sharpCornersAddon.id)
    : false

  // Check if 8mm is selected
  const thickness8mmSelected = thickness8mmAddon
    ? selectedAddons.has(thickness8mmAddon.id)
    : false

  // For circles, sharp corners is not available
  const isCircle = poolShape === 'circle'

  // For rectangles, 8mm requires sharp corners
  const thickness8mmRequiresSharpCorners = !isCircle && sharpCornersAddon != null

  // Toggle addon selection
  const toggleAddon = useCallback(
    (addonId: string) => {
      setSelectedAddons((prev) => {
        const next = new Set(prev)

        if (next.has(addonId)) {
          // Unchecking
          next.delete(addonId)

          // If unchecking sharp corners, also uncheck 8mm (for rectangles)
          if (
            sharpCornersAddon &&
            addonId === sharpCornersAddon.id &&
            thickness8mmAddon &&
            !isCircle
          ) {
            next.delete(thickness8mmAddon.id)
          }
        } else {
          // Checking
          next.add(addonId)

          // If checking 8mm and it requires sharp corners, auto-check sharp corners
          if (
            thickness8mmAddon &&
            addonId === thickness8mmAddon.id &&
            sharpCornersAddon &&
            thickness8mmRequiresSharpCorners
          ) {
            next.add(sharpCornersAddon.id)
          }
        }

        return next
      })
    },
    [sharpCornersAddon, thickness8mmAddon, isCircle, thickness8mmRequiresSharpCorners]
  )

  // Calculate total price
  const totalPrice = useMemo(() => {
    let total = skeletonPrice

    if (sharpCornersAddon && selectedAddons.has(sharpCornersAddon.id)) {
      total += sharpCornersPrice
    }

    if (thickness8mmAddon && selectedAddons.has(thickness8mmAddon.id)) {
      total += thickness8mmPrice
    }

    return total
  }, [
    skeletonPrice,
    selectedAddons,
    sharpCornersAddon,
    thickness8mmAddon,
    sharpCornersPrice,
    thickness8mmPrice,
  ])

  // Handle confirm - returns single item with addons in name and price
  const handleConfirm = useCallback(() => {
    if (!skeleton) return

    // Build addon suffix for name
    const addons: string[] = []
    if (sharpCornersAddon && selectedAddons.has(sharpCornersAddon.id)) {
      addons.push('ostré rohy')
    }
    if (thickness8mmAddon && selectedAddons.has(thickness8mmAddon.id)) {
      addons.push('8mm')
    }

    const addonSuffix = addons.length > 0 ? ` (${addons.join(', ')})` : ''
    const name = skeleton.name + addonSuffix

    onConfirm({
      product: skeleton,
      name,
      price: totalPrice,
    })
  }, [
    skeleton,
    totalPrice,
    selectedAddons,
    sharpCornersAddon,
    thickness8mmAddon,
    onConfirm,
  ])

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Format dimensions for display
  const formatDimensions = () => {
    if (poolShape === 'circle') {
      return `${dimensions.diameter}×${dimensions.depth}m`
    }
    return `${dimensions.width}×${dimensions.length}×${dimensions.depth}m`
  }

  if (!skeleton) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat skelet s příplatky</DialogTitle>
          <DialogDescription>
            Vyberte příplatky pro bazénový skelet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Skeleton info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="font-medium">{skeleton.name}</div>
            <div className="text-sm text-muted-foreground">
              Rozměry: {formatDimensions()}
            </div>
            <div className="text-sm font-medium mt-1">
              Základní cena: {formatPrice(skeletonPrice)}
            </div>
          </div>

          <Separator />

          {/* Addons */}
          <div className="space-y-3">
            {/* Sharp corners - only for rectangles */}
            {sharpCornersAddon && !isCircle && (
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  sharpCornersSelected
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={sharpCornersSelected}
                  onCheckedChange={() => toggleAddon(sharpCornersAddon.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium">Ostré rohy</div>
                  <div className="text-sm text-muted-foreground">
                    +{SHARP_CORNERS_PERCENTAGE}% z ceny skeletu = {formatPrice(sharpCornersPrice)}
                  </div>
                </div>
              </label>
            )}

            {/* 8mm thickness */}
            {thickness8mmAddon && (
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  thickness8mmSelected
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                } ${
                  thickness8mmRequiresSharpCorners && !sharpCornersSelected
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <Checkbox
                  checked={thickness8mmSelected}
                  onCheckedChange={() => toggleAddon(thickness8mmAddon.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium">8mm tloušťka materiálu</div>
                  <div className="text-sm text-muted-foreground">
                    +{THICKNESS_8MM_PRICE_PER_M2} Kč/m² = {formatPrice(thickness8mmPrice)} ({formatPoolSurface(poolSurface)})
                  </div>
                  {thickness8mmRequiresSharpCorners && !sharpCornersSelected && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Vyžaduje ostré rohy (budou přidány automaticky)
                    </div>
                  )}
                </div>
              </label>
            )}

            {/* Info for circles */}
            {isCircle && sharpCornersAddon && (
              <div className="text-sm text-muted-foreground italic">
                Pro kruhové bazény není dostupná volba ostrých rohů.
              </div>
            )}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Celkem</span>
            <span>{formatPrice(totalPrice)}</span>
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
