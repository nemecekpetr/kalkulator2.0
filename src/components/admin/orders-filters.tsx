'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/supabase/types'

export function OrdersFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const status = searchParams.get('status') || 'all'

  const updateFilters = useCallback((updates: { status?: string; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.status !== undefined) {
      if (updates.status === 'all') {
        params.delete('status')
      } else {
        params.set('status', updates.status)
      }
    }

    if (updates.search !== undefined) {
      if (updates.search === '') {
        params.delete('search')
      } else {
        params.set('search', updates.search)
      }
    }

    // Reset to page 1 when filters change
    params.delete('page')

    router.push(`/admin/objednavky?${params.toString()}`)
  }, [router, searchParams])

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateFilters({ search })
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, updateFilters])

  const clearFilters = () => {
    setSearch('')
    router.push('/admin/objednavky')
  }

  const hasActiveFilters = search || status !== 'all'

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Hledat podle cisla, zakaznika..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status filter */}
      <Select
        value={status}
        onValueChange={(value) => updateFilters({ status: value })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Stav objednavky" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vsechny stavy</SelectItem>
          {(Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Actions */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters}>
          <X className="w-4 h-4 mr-2" />
          Zrusit filtry
        </Button>
      )}
    </div>
  )
}
