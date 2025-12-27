'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductionOrder, ProductionStatus } from '@/lib/supabase/types'
import { PRODUCTION_STATUS_LABELS } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
}

const POOL_SHAPES = [
  { value: 'circle', label: 'Kruhový' },
  { value: 'rectangle_rounded', label: 'Obdélník zaoblený' },
  { value: 'rectangle_sharp', label: 'Obdélník ostrý' },
]

const POOL_TYPES = [
  { value: 'skimmer', label: 'Skimmer' },
  { value: 'overflow', label: 'Přelivový' },
]

const POOL_COLORS = [
  { value: 'blue', label: 'Modrá' },
  { value: 'white', label: 'Bílá' },
  { value: 'gray', label: 'Šedá' },
  { value: 'combination', label: 'Kombinace' },
]

export default function EditProductionPage({ params }: PageProps) {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [production, setProduction] = useState<ProductionOrder | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    status: 'pending' as ProductionStatus,
    assigned_to: '',
    production_start_date: '',
    production_end_date: '',
    assembly_date: '',
    pool_shape: '',
    pool_type: '',
    pool_dimensions: '',
    pool_color: '',
    pool_depth: '',
    notes: '',
    internal_notes: '',
  })

  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return

    const fetchProduction = async () => {
      try {
        const response = await fetch(`/api/admin/production/${id}`)
        if (response.ok) {
          const data = await response.json()
          setProduction(data)
          setFormData({
            status: data.status || 'pending',
            assigned_to: data.assigned_to || '',
            production_start_date: data.production_start_date || '',
            production_end_date: data.production_end_date || '',
            assembly_date: data.assembly_date || '',
            pool_shape: data.pool_shape || '',
            pool_type: data.pool_type || '',
            pool_dimensions: data.pool_dimensions || '',
            pool_color: data.pool_color || '',
            pool_depth: data.pool_depth || '',
            notes: data.notes || '',
            internal_notes: data.internal_notes || '',
          })
        } else {
          toast.error('Nepodařilo se načíst výrobní zadání')
          router.push('/admin/vyroba')
        }
      } catch {
        toast.error('Nepodařilo se načíst výrobní zadání')
        router.push('/admin/vyroba')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduction()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/production/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          production_start_date: formData.production_start_date || null,
          production_end_date: formData.production_end_date || null,
          assembly_date: formData.assembly_date || null,
        }),
      })

      if (response.ok) {
        toast.success('Výrobní zadání bylo uloženo')
        router.push(`/admin/vyroba/${id}`)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Nepodařilo se uložit výrobní zadání')
      }
    } catch {
      toast.error('Nepodařilo se uložit výrobní zadání')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!production) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/vyroba/${id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upravit {production.production_number}</h1>
          <p className="text-muted-foreground">Editace výrobního zadání</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            {/* Status & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Stav a přiřazení</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Stav</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as ProductionStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRODUCTION_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Přiřazeno</Label>
                  <Input
                    id="assigned_to"
                    value={formData.assigned_to}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to: e.target.value })
                    }
                    placeholder="Jméno pracovníka"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Termíny</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="production_start_date">Zahájení výroby</Label>
                  <Input
                    id="production_start_date"
                    type="date"
                    value={formData.production_start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, production_start_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production_end_date">Dokončení výroby</Label>
                  <Input
                    id="production_end_date"
                    type="date"
                    value={formData.production_end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, production_end_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assembly_date">Datum montáže</Label>
                  <Input
                    id="assembly_date"
                    type="date"
                    value={formData.assembly_date}
                    onChange={(e) =>
                      setFormData({ ...formData, assembly_date: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Poznámky</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Poznámky</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Poznámky k výrobě..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_notes">Interní poznámky</Label>
                  <Textarea
                    id="internal_notes"
                    value={formData.internal_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, internal_notes: e.target.value })
                    }
                    placeholder="Interní poznámky (neviditelné pro zákazníka)..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Pool specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Specifikace bazénu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pool_dimensions">Rozměry</Label>
                  <Input
                    id="pool_dimensions"
                    value={formData.pool_dimensions}
                    onChange={(e) =>
                      setFormData({ ...formData, pool_dimensions: e.target.value })
                    }
                    placeholder="např. 6 x 3 m"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pool_depth">Hloubka</Label>
                  <Input
                    id="pool_depth"
                    value={formData.pool_depth}
                    onChange={(e) =>
                      setFormData({ ...formData, pool_depth: e.target.value })
                    }
                    placeholder="např. 1.2 - 1.5 m"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pool_shape">Tvar</Label>
                  <Select
                    value={formData.pool_shape}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pool_shape: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte tvar" />
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_SHAPES.map((shape) => (
                        <SelectItem key={shape.value} value={shape.value}>
                          {shape.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pool_type">Typ</Label>
                  <Select
                    value={formData.pool_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pool_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pool_color">Barva</Label>
                  <Select
                    value={formData.pool_color}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pool_color: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte barvu" />
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" asChild>
            <Link href={`/admin/vyroba/${id}`}>Zrušit</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Uložit změny
          </Button>
        </div>
      </form>
    </div>
  )
}
