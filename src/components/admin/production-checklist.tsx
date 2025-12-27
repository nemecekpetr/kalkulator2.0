'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductionOrderItem } from '@/lib/supabase/types'

interface ProductionChecklistProps {
  productionOrderId: string
  items: ProductionOrderItem[]
}

export function ProductionChecklist({ productionOrderId, items: initialItems }: ProductionChecklistProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')

  const handleToggle = async (itemId: string, checked: boolean) => {
    setLoadingItems((prev) => new Set(prev).add(itemId))

    try {
      const response = await fetch(`/api/admin/production/${productionOrderId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, checked }),
      })

      if (response.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, checked } : item
          )
        )
      } else {
        toast.error('Nepodařilo se aktualizovat položku')
      }
    } catch {
      toast.error('Nepodařilo se aktualizovat položku')
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error('Zadejte název položky')
      return
    }

    setIsAddingItem(true)
    try {
      const response = await fetch(`/api/admin/production/${productionOrderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_name: newItemName.trim(),
          quantity: parseFloat(newItemQuantity) || 1,
          unit: 'ks',
        }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setItems((prev) => [...prev, newItem])
        setNewItemName('')
        setNewItemQuantity('1')
        toast.success('Položka přidána')
      } else {
        toast.error('Nepodařilo se přidat položku')
      }
    } catch {
      toast.error('Nepodařilo se přidat položku')
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    setLoadingItems((prev) => new Set(prev).add(itemId))

    try {
      const response = await fetch(
        `/api/admin/production/${productionOrderId}/items?item_id=${itemId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== itemId))
        toast.success('Položka smazána')
      } else {
        toast.error('Nepodařilo se smazat položku')
      }
    } catch {
      toast.error('Nepodařilo se smazat položku')
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || 'Ostatní'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {} as Record<string, ProductionOrderItem[]>
  )

  const categories = Object.keys(groupedItems).sort()

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-center text-muted-foreground py-8">
          Žádné položky v kusovníku
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Název položky..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Input
            type="number"
            placeholder="Počet"
            className="w-24"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
          />
          <Button onClick={handleAddItem} disabled={isAddingItem}>
            {isAddingItem ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
            {category}
          </h4>
          <div className="space-y-1">
            {groupedItems[category]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group ${
                    item.checked ? 'opacity-60' : ''
                  }`}
                >
                  {loadingItems.has(item.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        handleToggle(item.id, checked as boolean)
                      }
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`${item.checked ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.material_name}
                    </span>
                    {item.material_code && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.material_code})
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {item.quantity} {item.unit}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={loadingItems.has(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Add new item */}
      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-2">Přidat položku</p>
        <div className="flex gap-2">
          <Input
            placeholder="Název položky..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Input
            type="number"
            placeholder="Počet"
            className="w-24"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
          />
          <Button onClick={handleAddItem} disabled={isAddingItem}>
            {isAddingItem ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
