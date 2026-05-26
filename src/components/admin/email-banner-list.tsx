'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  deleteSignatureBanner,
  getSignatureBannerUserCount,
} from '@/app/actions/signature-banners-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { EmailBannerDialog } from './email-banner-dialog'
import type { SignatureBanner } from '@/lib/supabase/types'
import { Plus, Pencil, Trash2, Star, ExternalLink, Loader2 } from 'lucide-react'

interface EmailBannerListProps {
  initialBanners: SignatureBanner[]
}

export function EmailBannerList({ initialBanners }: EmailBannerListProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<SignatureBanner | null>(null)
  const [deletingBanner, setDeletingBanner] = useState<SignatureBanner | null>(null)
  const [deleteUserCount, setDeleteUserCount] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openCreate = () => {
    setEditingBanner(null)
    setDialogOpen(true)
  }

  const openEdit = (banner: SignatureBanner) => {
    setEditingBanner(banner)
    setDialogOpen(true)
  }

  const openDelete = async (banner: SignatureBanner) => {
    setDeletingBanner(banner)
    setDeleteUserCount(null)
    const { count } = await getSignatureBannerUserCount(banner.id)
    setDeleteUserCount(count)
  }

  const confirmDelete = async () => {
    if (!deletingBanner) return
    setIsDeleting(true)
    try {
      const result = await deleteSignatureBanner(deletingBanner.id)
      if (result.success) {
        toast.success('Banner byl smazán')
        setDeletingBanner(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se smazat banner')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nový banner
        </Button>
      </div>

      {initialBanners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{'Zatím nemáte žádné bannery. Vytvořte první kliknutím na „Nový banner".'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialBanners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              <div className="bg-muted aspect-[4/1] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image_url}
                  alt={banner.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight">{banner.name}</h3>
                  {banner.is_evergreen && (
                    <Badge variant="secondary" className="shrink-0">
                      <Star className="w-3 h-3 mr-1" />
                      Evergreen
                    </Badge>
                  )}
                </div>
                <a
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{banner.link_url}</span>
                </a>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(banner)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Upravit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDelete(banner)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EmailBannerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        banner={editingBanner}
      />

      <AlertDialog open={!!deletingBanner} onOpenChange={(open) => !open && setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Smazat banner „${deletingBanner?.name ?? ''}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUserCount === null
                ? 'Zjišťuji, kdo má tento banner vybraný…'
                : deleteUserCount > 0
                  ? `Banner má vybraných ${deleteUserCount} ${
                      deleteUserCount === 1 ? 'pracovník' : deleteUserCount < 5 ? 'pracovníky' : 'pracovníků'
                    }. Po smazání se jim podpis automaticky přepne na evergreen banner.`
                  : 'Banner nemá vybraných žádných pracovníků.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
