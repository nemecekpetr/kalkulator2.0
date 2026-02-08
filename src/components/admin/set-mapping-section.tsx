'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Info, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { SET_DIMENSION_MAP } from '@/lib/quote-generator'
import type { Product, SetAddon } from '@/lib/supabase/types'

interface SetMappingSectionProps {
  setProducts: Product[]
}

// Reverse lookup: code → dimension key
function getDimensionsForCode(code: string): string | null {
  for (const [dimKey, setCode] of Object.entries(SET_DIMENSION_MAP)) {
    if (setCode === code) return dimKey
  }
  return null
}

// Format dimension key "6-3" → "6 × 3 m"
function formatDimensions(dimKey: string): string {
  const parts = dimKey.split('-')
  if (parts.length === 2) {
    return `${parts[0]} × ${parts[1]} m`
  }
  return dimKey
}

// Describe auto-assignment rule for an addon
function getAutoAssignmentDescription(addon: SetAddon): string | null {
  const name = addon.name.toLowerCase()

  // Depth addons
  const depthMatch = name.match(/hloubka (\d+[,,]\d+)\s*m?/)
  if (depthMatch) {
    const depth = depthMatch[1].replace(',', '.')
    return `Při hloubce ${depth}m`
  }

  // Sharp corners
  if (name.includes('ostré rohy')) {
    return 'Při ostrém tvaru bazénu'
  }

  // Stairs
  if (name.includes('schody přes šířku')) {
    return 'Při volbě schodů „přes šířku"'
  }
  if (name.includes('trojúhelníkové schody')) {
    return 'Při volbě trojúhelníkových schodů'
  }
  if (name.includes('románské schody')) {
    return 'Při volbě románských schodů'
  }

  return null
}

export function SetMappingSection({ setProducts }: SetMappingSectionProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null)

  // Enrich sets with dimension info
  const enrichedSets = useMemo(() => {
    return setProducts
      .map(product => {
        const dimKey = getDimensionsForCode(product.code || '')
        return {
          ...product,
          dimKey,
          formattedDimensions: dimKey ? formatDimensions(dimKey) : null,
          addonCount: product.set_addons?.length || 0,
        }
      })
      .sort((a, b) => {
        // Mapped sets first, then by dimension key
        if (a.dimKey && !b.dimKey) return -1
        if (!a.dimKey && b.dimKey) return 1
        if (a.dimKey && b.dimKey) return a.dimKey.localeCompare(b.dimKey, undefined, { numeric: true })
        return a.name.localeCompare(b.name)
      })
  }, [setProducts])

  // Stats
  const stats = useMemo(() => {
    const withAddons = enrichedSets.filter(s => s.addonCount > 0).length
    const mapped = enrichedSets.filter(s => s.dimKey).length
    return {
      total: enrichedSets.length,
      withAddons,
      mapped,
      unmapped: enrichedSets.length - mapped,
    }
  }, [enrichedSets])

  const toggleExpand = (productId: string) => {
    setExpandedSet(prev => prev === productId ? null : productId)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-muted rounded-lg text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Celkem setů</div>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-amber-700">{stats.mapped}</div>
          <div className="text-sm text-amber-600">Přiřazeno k rozměrům</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">{stats.withAddons}</div>
          <div className="text-sm text-green-600">S addony</div>
        </div>
        {stats.unmapped > 0 && (
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.unmapped}</div>
            <div className="text-sm text-red-600">Nepřiřazeno</div>
          </div>
        )}
      </div>

      {/* Sets table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead>Kód</TableHead>
              <TableHead>Rozměry</TableHead>
              <TableHead>Název</TableHead>
              <TableHead className="text-right">Cena</TableHead>
              <TableHead className="text-center">Addony</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrichedSets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Žádné sety v katalogu
                </TableCell>
              </TableRow>
            ) : (
              enrichedSets.map(product => (
                <SetRow
                  key={product.id}
                  product={product}
                  isExpanded={expandedSet === product.id}
                  onToggle={() => toggleExpand(product.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-muted-foreground">
          Při generování nabídky se set automaticky použije místo skeletu pokud rozměry odpovídají.
          Schody se řeší výhradně přes set addony.
        </p>
      </div>
    </div>
  )
}

// Separated row component for set + expandable addon detail
function SetRow({
  product,
  isExpanded,
  onToggle,
}: {
  product: Product & { dimKey: string | null; formattedDimensions: string | null; addonCount: number }
  isExpanded: boolean
  onToggle: () => void
}) {
  const addons = (product.set_addons || []) as SetAddon[]
  const hasAddons = addons.length > 0

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-amber-50/50 ${isExpanded ? 'bg-amber-50/30' : ''}`}
        onClick={onToggle}
      >
        <TableCell className="w-10">
          {hasAddons ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : null}
        </TableCell>
        <TableCell className="font-mono text-sm">{product.code}</TableCell>
        <TableCell>
          {product.formattedDimensions ? (
            <Badge variant="secondary">{product.formattedDimensions}</Badge>
          ) : (
            <span className="text-amber-600 text-sm flex items-center gap-1">
              <Info className="h-3 w-3" />
              Nepřiřazeno k rozměrům
            </span>
          )}
        </TableCell>
        <TableCell className="font-medium">{product.name}</TableCell>
        <TableCell className="text-right font-medium">{formatPrice(product.unit_price)}</TableCell>
        <TableCell className="text-center">
          {hasAddons ? (
            <Badge variant="outline">{product.addonCount} addonů</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded addon detail */}
      {isExpanded && hasAddons && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="p-0">
            <div className="bg-amber-50/50 border-t border-amber-200 px-8 py-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Addon</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead>Auto-přiřazení</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map(addon => {
                      const autoDesc = getAutoAssignmentDescription(addon)
                      return (
                        <TableRow key={addon.id} className="hover:bg-amber-100/50">
                          <TableCell className="font-medium">{addon.name}</TableCell>
                          <TableCell className="text-right">{formatPrice(addon.price)}</TableCell>
                          <TableCell>
                            {autoDesc ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {autoDesc}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">— (manuální)</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
