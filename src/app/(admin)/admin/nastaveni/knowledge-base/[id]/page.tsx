'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, RefreshCw, Trash2 } from 'lucide-react'
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
import type { AssistantKnowledge } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditKnowledgePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [item, setItem] = useState<AssistantKnowledge | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    source_url: '',
    source_type: 'internal',
    content: '',
    keywords: '',
    active: true,
  })

  useEffect(() => {
    async function fetchItem() {
      try {
        const response = await fetch(`/api/admin/knowledge-base/${id}`)
        const data = await response.json()

        if (response.ok) {
          setItem(data.item)
          setFormData({
            title: data.item.title || '',
            source_url: data.item.source_url || '',
            source_type: data.item.source_type,
            content: data.item.content,
            keywords: data.item.keywords?.join(', ') || '',
            active: data.item.active,
          })
        } else {
          setError(data.error || 'Nepodařilo se načíst')
        }
      } catch (err) {
        setError('Nepodařilo se načíst')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/knowledge-base/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: formData.keywords
            ? formData.keywords.split(',').map((k) => k.trim())
            : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Nepodařilo se uložit')
        return
      }

      router.push('/admin/nastaveni/knowledge-base')
    } catch (err) {
      setError('Nepodařilo se uložit')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/knowledge-base/${id}?hard=true`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/admin/nastaveni/knowledge-base')
      }
    } catch (err) {
      setError('Nepodařilo se smazat')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Znalost nenalezena</p>
        <Button
          variant="link"
          onClick={() => router.push('/admin/nastaveni/knowledge-base')}
        >
          Zpět na seznam
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/nastaveni/knowledge-base')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Upravit znalost</h1>
            <p className="text-muted-foreground">ID: {id}</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Smazat trvale
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informace o znalosti</CardTitle>
            <CardDescription>
              Upravte informace o znalosti v bázi AI asistenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Aktivní</Label>
                <p className="text-xs text-muted-foreground">
                  Neaktivní znalosti nebudou použity v odpovědích
                </p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, active: checked })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titulek</Label>
                <Input
                  id="title"
                  placeholder="Např. Jak vybrat tepelné čerpadlo"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_type">Typ zdroje</Label>
                <Select
                  value={formData.source_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webpage">Webová stránka</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="product_info">Produktové info</SelectItem>
                    <SelectItem value="manual">Manuál</SelectItem>
                    <SelectItem value="internal">Interní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_url">Zdrojová URL</Label>
              <Input
                id="source_url"
                type="url"
                placeholder="https://rentmil.cz/..."
                value={formData.source_url}
                onChange={(e) =>
                  setFormData({ ...formData, source_url: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Obsah *</Label>
              <Textarea
                id="content"
                placeholder="Text znalosti, kterou má asistent znát..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={12}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length.toLocaleString()} znaků
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Klíčová slova</Label>
              <Input
                id="keywords"
                placeholder="bazén, tepelné čerpadlo, ohřev (odděleno čárkami)"
                value={formData.keywords}
                onChange={(e) =>
                  setFormData({ ...formData, keywords: e.target.value })
                }
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/nastaveni/knowledge-base')}
              >
                Zrušit
              </Button>
              <Button type="submit" disabled={saving || !formData.content}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Uložit změny
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat znalost trvale?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Znalost bude trvale odstraněna z databáze.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Smazat trvale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
