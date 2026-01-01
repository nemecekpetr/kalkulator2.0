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
import { Badge } from '@/components/ui/badge'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ConfigurationsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const status = searchParams.get('status') || 'all'
  const pipedrive = searchParams.get('pipedrive') || 'all'

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateFilters({ search })
    }, 300)

    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const updateFilters = (updates: { status?: string; pipedrive?: string; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.status !== undefined) {
      if (updates.status === 'all') {
        params.delete('status')
      } else {
        params.set('status', updates.status)
      }
    }

    if (updates.pipedrive !== undefined) {
      if (updates.pipedrive === 'all') {
        params.delete('pipedrive')
      } else {
        params.set('pipedrive', updates.pipedrive)
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

  const hasActiveFilters = search || status !== 'all' || pipedrive !== 'all'

  // Get label for active status filter
  const getStatusLabel = (value: string) => {
    switch (value) {
      case 'new': return 'Nové'
      case 'processed': return 'Zpracované'
      default: return null
    }
  }

  // Get label for active pipedrive filter
  const getPipedriveLabel = (value: string) => {
    switch (value) {
      case 'success': return 'Odesláno'
      case 'pending': return 'Čekající'
      case 'error': return 'Chyba'
      default: return null
    }
  }

  return (
    <div className="space-y-3">
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

        {/* Pipedrive status filter */}
        <Select
          value={pipedrive}
          onValueChange={(value) => updateFilters({ pipedrive: value })}
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
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            Zrušit filtry
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {(status !== 'all' || pipedrive !== 'all') && (
        <div className="flex flex-wrap gap-2">
          {status !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => updateFilters({ status: 'all' })}
            >
              Stav: {getStatusLabel(status)}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {pipedrive !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => updateFilters({ pipedrive: 'all' })}
            >
              Pipedrive: {getPipedriveLabel(pipedrive)}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
