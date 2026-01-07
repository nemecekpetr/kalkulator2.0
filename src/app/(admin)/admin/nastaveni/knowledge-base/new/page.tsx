'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function NewKnowledgePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    source_url: '',
    source_type: 'internal',
    content: '',
    keywords: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const response = await fetch('/api/admin/knowledge-base', {
        method: 'POST',
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

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold">Nová znalost</h1>
          <p className="text-muted-foreground">
            Přidat novou znalost do báze AI asistenta
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informace o znalosti</CardTitle>
            <CardDescription>
              Vyplňte informace o znalosti, kterou chcete přidat do báze.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                URL původního zdroje (pro reference)
              </p>
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
              <p className="text-xs text-muted-foreground">
                Klíčová slova pro vyhledávání (oddělená čárkami)
              </p>
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
                Uložit
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
