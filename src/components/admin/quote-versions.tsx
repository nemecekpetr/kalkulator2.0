'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { History, RotateCcw, Save, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { QuoteVersion, Quote, QuoteItem } from '@/lib/supabase/types'

interface QuoteVersionsProps {
  quoteId: string
  onVersionRestored?: () => void
}

interface VersionSnapshot {
  quote: Quote
  items: QuoteItem[]
  created_at: string
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

export function QuoteVersions({ quoteId, onVersionRestored }: QuoteVersionsProps) {
  const [versions, setVersions] = useState<QuoteVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<QuoteVersion | null>(null)
  const [newVersionNotes, setNewVersionNotes] = useState('')

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/versions`)
      if (!response.ok) throw new Error('Failed to fetch versions')
      const data = await response.json()
      setVersions(data)
    } catch (error) {
      console.error('Error fetching versions:', error)
      toast.error('Chyba při načítání verzí')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [quoteId])

  const handleCreateVersion = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newVersionNotes }),
      })

      if (!response.ok) throw new Error('Failed to create version')

      toast.success('Verze byla uložena')
      setShowCreateDialog(false)
      setNewVersionNotes('')
      fetchVersions()
    } catch (error) {
      console.error('Error creating version:', error)
      toast.error('Chyba při ukládání verze')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreVersion = async () => {
    if (!selectedVersion) return

    setRestoring(true)
    try {
      const response = await fetch(
        `/api/admin/quotes/${quoteId}/versions/${selectedVersion.id}/restore`,
        { method: 'POST' }
      )

      if (!response.ok) throw new Error('Failed to restore version')

      toast.success(`Nabídka obnovena na verzi ${selectedVersion.version_number}`)
      setShowRestoreDialog(false)
      setSelectedVersion(null)
      fetchVersions()
      onVersionRestored?.()
    } catch (error) {
      console.error('Error restoring version:', error)
      toast.error('Chyba při obnovování verze')
    } finally {
      setRestoring(false)
    }
  }

  const handlePreview = (version: QuoteVersion) => {
    setSelectedVersion(version)
    setShowPreviewDialog(true)
  }

  const handleRestore = (version: QuoteVersion) => {
    setSelectedVersion(version)
    setShowRestoreDialog(true)
  }

  const getSnapshotData = (version: QuoteVersion): VersionSnapshot | null => {
    try {
      if (!version.snapshot || typeof version.snapshot !== 'object') {
        return null
      }
      return version.snapshot as unknown as VersionSnapshot
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historie verzí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historie verzí
          </CardTitle>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Save className="w-4 h-4 mr-2" />
            Uložit verzi
          </Button>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Zatím nebyla uložena žádná verze
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verze</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Poznámka</TableHead>
                  <TableHead>Celkem</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version, index) => {
                  const snapshot = getSnapshotData(version)
                  return (
                    <TableRow key={version.id}>
                      <TableCell>
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          v{version.version_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(version.created_at), 'd. MMM yyyy HH:mm', {
                          locale: cs,
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {version.notes || '-'}
                      </TableCell>
                      <TableCell>
                        {snapshot?.quote?.total_price
                          ? formatPrice(snapshot.quote.total_price)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(version)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(version)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Version Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uložit novou verzi</DialogTitle>
            <DialogDescription>
              Vytvoří se snapshot aktuálního stavu nabídky, ke kterému se můžete
              později vrátit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Poznámka (volitelné)</Label>
              <Textarea
                id="notes"
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
                placeholder="Např. Po schůzce se zákazníkem..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={saving}
            >
              Zrušit
            </Button>
            <Button onClick={handleCreateVersion} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uložit verzi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Náhled verze {selectedVersion?.version_number}
            </DialogTitle>
            <DialogDescription>
              {selectedVersion &&
                format(new Date(selectedVersion.created_at), 'd. MMMM yyyy HH:mm', {
                  locale: cs,
                })}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4">
              {(() => {
                const snapshot = getSnapshotData(selectedVersion)
                if (!snapshot) {
                  return <p className="text-muted-foreground">Data nejsou dostupná</p>
                }
                return (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Zákazník</p>
                      <p className="font-medium">{snapshot.quote.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Položky ({snapshot.items?.length || 0})
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Položka</TableHead>
                            <TableHead className="text-center">Množství</TableHead>
                            <TableHead className="text-right">Cena</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.items?.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-center">
                                {item.quantity} {item.unit}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPrice(item.total_price)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Celkem</p>
                        <p className="text-xl font-bold">
                          {formatPrice(snapshot.quote.total_price)}
                        </p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Zavřít
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obnovit verzi {selectedVersion?.version_number}?</DialogTitle>
            <DialogDescription>
              Aktuální stav nabídky bude nahrazen touto verzí. Před obnovením se
              automaticky vytvoří záloha aktuálního stavu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog(false)}
              disabled={restoring}
            >
              Zrušit
            </Button>
            <Button onClick={handleRestoreVersion} disabled={restoring}>
              {restoring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Obnovit verzi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
