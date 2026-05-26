'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  createSignatureBanner,
  updateSignatureBanner,
} from '@/app/actions/signature-banners-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { SignatureBanner } from '@/lib/supabase/types'
import { Loader2, UploadCloud } from 'lucide-react'

const bannerSchema = z.object({
  name: z.string().min(2, 'Vyplňte název banneru'),
  link_url: z.string().url('URL odkazu není platná'),
  is_evergreen: z.boolean(),
  sort_order: z.number().int().min(0),
})

type BannerFormData = z.infer<typeof bannerSchema>

const TARGET_WIDTH = 1200
const TARGET_HEIGHT = 300
const ASPECT_TOLERANCE = 0.05

interface EmailBannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  banner: SignatureBanner | null
}

export function EmailBannerDialog({ open, onOpenChange, banner }: EmailBannerDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dimensionWarning, setDimensionWarning] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isEditing = !!banner

  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      name: '',
      link_url: '',
      is_evergreen: false,
      sort_order: 0,
    },
  })

  useEffect(() => {
    if (!open) return
    if (banner) {
      form.reset({
        name: banner.name,
        link_url: banner.link_url,
        is_evergreen: banner.is_evergreen,
        sort_order: banner.sort_order,
      })
      setPreviewUrl(banner.image_url.startsWith('http') ? banner.image_url : banner.image_url)
    } else {
      form.reset({ name: '', link_url: '', is_evergreen: false, sort_order: 0 })
      setPreviewUrl(null)
    }
    setFile(null)
    setDimensionWarning(null)
  }, [open, banner, form])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) {
      setFile(null)
      return
    }

    if (!['image/png', 'image/jpeg'].includes(selected.type)) {
      toast.error('Banner musí být PNG nebo JPG')
      return
    }
    if (selected.size > 1024 * 1024) {
      toast.error('Banner je větší než 1 MB')
      return
    }

    setFile(selected)
    const objectUrl = URL.createObjectURL(selected)
    setPreviewUrl(objectUrl)

    const img = new Image()
    img.onload = () => {
      const targetAspect = TARGET_WIDTH / TARGET_HEIGHT
      const actualAspect = img.width / img.height
      const deviation = Math.abs(actualAspect - targetAspect) / targetAspect
      if (deviation > ASPECT_TOLERANCE) {
        setDimensionWarning(
          `Doporučený poměr stran je ${TARGET_WIDTH}×${TARGET_HEIGHT} (4:1). Tvůj obrázek má ${img.width}×${img.height}.`
        )
      } else {
        setDimensionWarning(null)
      }
    }
    img.src = objectUrl
  }

  const onSubmit = async (data: BannerFormData) => {
    if (!isEditing && !file) {
      toast.error('Vyberte obrázek banneru — klikni na šedou plochu nahoře a vyber PNG/JPG ze svého počítače')
      return
    }

    console.log('[banner-dialog] submitting', { hasFile: !!file, fileName: file?.name, data })
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('link_url', data.link_url)
      formData.append('is_evergreen', String(data.is_evergreen))
      formData.append('sort_order', String(data.sort_order))
      if (file) formData.append('file', file)

      const result = isEditing
        ? await updateSignatureBanner(banner!.id, formData)
        : await createSignatureBanner(formData)

      if (result.success) {
        toast.success(isEditing ? 'Banner byl upraven' : 'Banner byl vytvořen')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Operace selhala')
      }
    } catch (error) {
      console.error(error)
      toast.error('Nepodařilo se uložit banner')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Upravit banner' : 'Nový banner'}</DialogTitle>
          <DialogDescription>
            Doporučený rozměr 1200×300 px (poměr 4:1), max 1 MB, PNG nebo JPG.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error('[banner-dialog] validation errors:', errors)
            const firstError = Object.values(errors)[0]?.message as string | undefined
            toast.error(firstError || 'Zkontroluj vyplněná pole')
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Obrázek banneru {!isEditing && '*'}</Label>
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/60 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Náhled banneru"
                    className="mx-auto max-h-32 object-contain"
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Vybraný soubor: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-muted-foreground">
                  <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">Klikni pro výběr souboru z počítače</p>
                  <p className="text-xs mt-1">PNG nebo JPG, max 1 MB, ideálně 1200×300 px</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
            {dimensionWarning && (
              <p className="text-xs text-amber-600">{dimensionWarning}</p>
            )}
            {!isEditing && !file && (
              <p className="text-xs text-destructive">Vyberte obrázek banneru, jinak nelze pokračovat.</p>
            )}
            {isEditing && !file && (
              <p className="text-xs text-muted-foreground">
                Pro výměnu obrázku vyber nový soubor. Jinak zůstane stávající.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Název *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Zazimování 2026"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_url">URL odkazu *</Label>
            <Input
              id="link_url"
              type="url"
              {...form.register('link_url')}
              placeholder="https://rentmil.cz/zazimovani"
            />
            {form.formState.errors.link_url && (
              <p className="text-sm text-destructive">{form.formState.errors.link_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Pořadí v seznamu</Label>
            <Input
              id="sort_order"
              type="number"
              min={0}
              {...form.register('sort_order', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Bannery s nižším číslem se zobrazují první.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="is_evergreen"
              checked={form.watch('is_evergreen')}
              onCheckedChange={(value) => form.setValue('is_evergreen', value === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="is_evergreen" className="cursor-pointer">
                Označit jako evergreen (výchozí banner)
              </Label>
              <p className="text-xs text-muted-foreground">
                Tento banner se použije u všech pracovníků, kteří si nevybrali konkrétní.
                Naráz může být evergreen pouze jeden — flag se z předchozího odebere.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && !file)}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Uložit' : 'Vytvořit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
