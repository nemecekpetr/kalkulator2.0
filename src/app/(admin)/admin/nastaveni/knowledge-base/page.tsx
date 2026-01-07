'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { AssistantKnowledge } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const sourceTypeLabels: Record<string, string> = {
  webpage: 'Webová stránka',
  faq: 'FAQ',
  product_info: 'Produktové info',
  manual: 'Manuál',
  internal: 'Interní',
}

export default function KnowledgeBasePage() {
  const router = useRouter()
  const [items, setItems] = useState<AssistantKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceType, setSourceType] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importUrl, setImportUrl] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (sourceType !== 'all') params.set('source_type', sourceType)
      if (showInactive) params.set('active', 'false')

      const response = await fetch(`/api/admin/knowledge-base?${params}`)
      const data = await response.json()

      if (response.ok) {
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching knowledge base:', error)
    } finally {
      setLoading(false)
    }
  }, [search, sourceType, showInactive])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/admin/knowledge-base/${deleteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems(items.filter((item) => item.id !== deleteId))
      }
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setDeleteId(null)
    }
  }

  const handleImport = async () => {
    if (!importUrl) return

    setImporting(true)
    try {
      const response = await fetch('/api/admin/knowledge-base/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })

      const data = await response.json()

      if (response.ok) {
        setImportUrl('')
        fetchItems()
      } else {
        alert(data.error || 'Import selhal')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import selhal')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Správa znalostní báze AI asistenta
          </p>
        </div>
        <Button onClick={() => router.push('/admin/nastaveni/knowledge-base/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Přidat znalost
        </Button>
      </div>

      {/* Import from URL */}
      <div className="flex gap-2 p-4 bg-muted rounded-lg">
        <Input
          placeholder="Import z URL (např. https://rentmil.cz/bazeny)"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={handleImport}
          disabled={!importUrl || importing}
          variant="secondary"
        >
          {importing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Importovat
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sourceType} onValueChange={setSourceType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Typ zdroje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            <SelectItem value="webpage">Webová stránka</SelectItem>
            <SelectItem value="faq">FAQ</SelectItem>
            <SelectItem value="product_info">Produktové info</SelectItem>
            <SelectItem value="manual">Manuál</SelectItem>
            <SelectItem value="internal">Interní</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? 'secondary' : 'outline'}
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? 'Včetně neaktivních' : 'Pouze aktivní'}
        </Button>
        <Button variant="outline" onClick={fetchItems}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulek</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Zdroj</TableHead>
              <TableHead>Délka</TableHead>
              <TableHead>Aktualizováno</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Žádné znalosti nenalezeny
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className={!item.active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.title || '(bez titulku)'}
                      {!item.active && (
                        <Badge variant="outline" className="text-xs">
                          neaktivní
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {sourceTypeLabels[item.source_type] || item.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {new URL(item.source_url).hostname}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.content.length.toLocaleString()} znaků
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                      locale: cs,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/nastaveni/knowledge-base/${item.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat znalost?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce deaktivuje znalost. Nebude už použita v odpovědích
              asistenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
