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
import { Search, X, Download } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ConfigurationsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const status = searchParams.get('status') || 'all'

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateFilters({ search })
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

  const updateFilters = (updates: { status?: string; search?: string }) => {
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

    router.push(`/admin/konfigurace?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    router.push('/admin/konfigurace')
  }

  const handleExportCSV = async () => {
    // Build query string with current filters
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)

    // Open download in new tab
    window.open(`/api/admin/export?${params.toString()}`, '_blank')
  }

  const hasActiveFilters = search || status !== 'all'

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Hledat podle jména, emailu, telefonu..."
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
          <SelectValue placeholder="Pipedrive status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Všechny statusy</SelectItem>
          <SelectItem value="success">Odesláno</SelectItem>
          <SelectItem value="pending">Čekající</SelectItem>
          <SelectItem value="error">Chyba</SelectItem>
        </SelectContent>
      </Select>

      {/* Actions */}
      <div className="flex gap-2">
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Zrušit filtry
          </Button>
        )}
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  )
}
