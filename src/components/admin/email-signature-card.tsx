'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateMyProfile, sendTestSignatureEmail } from '@/app/actions/profile-actions'
import {
  renderBannerSignature,
  renderCompactSignature,
  type SignatureData,
  type RenderedSignature,
} from '@/lib/email/signature-templates'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  SignatureBanner,
  SignatureTemplate,
  UserProfile,
} from '@/lib/supabase/types'
import { Copy, Download, ChevronDown, Star, Info, Mail, Loader2 } from 'lucide-react'

interface EmailSignatureCardProps {
  profile: UserProfile
  banners: SignatureBanner[]
}

const AUTOSAVE_DELAY_MS = 400

export function EmailSignatureCard({ profile, banners }: EmailSignatureCardProps) {
  const [template, setTemplate] = useState<SignatureTemplate>(
    profile.signature_template || 'banner'
  )
  const [bannerId, setBannerId] = useState<string | null>(profile.signature_banner_id)
  const [helpOpen, setHelpOpen] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const evergreenBanner = useMemo(() => banners.find((b) => b.is_evergreen) || null, [banners])
  const selectedBanner = useMemo(() => {
    if (!bannerId) return evergreenBanner
    return banners.find((b) => b.id === bannerId) || evergreenBanner
  }, [bannerId, banners, evergreenBanner])

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_APP_URL || 'https://rentmil.cz'
    }
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  }, [])

  const rendered = useMemo<RenderedSignature>(() => {
    const data: SignatureData = {
      fullName: profile.full_name,
      position: profile.position,
      email: profile.email || '',
      phone: profile.phone,
    }
    const options = { baseUrl, banner: template === 'banner' ? selectedBanner : null }
    return template === 'banner'
      ? renderBannerSignature(data, options)
      : renderCompactSignature(data, options)
  }, [profile, template, selectedBanner, baseUrl])

  const previewDoc = useMemo(() => {
    return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#fff;}</style></head><body>${rendered.html}</body></html>`
  }, [rendered.html])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      const result = await updateMyProfile({
        signature_template: template,
        signature_banner_id: bannerId,
      })
      if (!result.success) {
        toast.error(result.error || 'Nepodařilo se uložit nastavení podpisu')
      }
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [template, bannerId])

  const writeToClipboard = async (
    html: string,
    plainText: string,
    successMessage: string
  ) => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(html)
      }
      toast.success(successMessage)
    } catch (error) {
      console.error('Clipboard write failed:', error)
      toast.error('Kopírování selhalo. Použijte tlačítko „Stáhnout .htm".')
    }
  }

  const handleCopy = () =>
    writeToClipboard(
      rendered.html,
      rendered.plainText,
      'Podpis zkopírován — vložte ho v nastavení podpisu (Cmd+V / Ctrl+V)'
    )

  const handleCopyPipedrive = () =>
    writeToClipboard(
      rendered.htmlPipedrive,
      rendered.plainText,
      'Podpis zkopírován pro Pipedrive — vložte ho do editoru (Cmd+V)'
    )

  const handleSendTest = async () => {
    if (!profile.email) {
      toast.error('V profilu chybí kontaktní email — doplňte ho v sekci Osobní údaje.')
      return
    }
    setSendingTest(true)
    try {
      const result = await sendTestSignatureEmail({
        html: rendered.html,
        plainText: rendered.plainText,
      })
      if (result.success) {
        toast.success(`Testovací email odeslán na ${result.sentTo}. Zkontrolujte schránku (i složku spam).`)
      } else {
        toast.error(result.error || 'Nepodařilo se odeslat testovací email')
      }
    } finally {
      setSendingTest(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([previewDoc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rentmil-podpis.htm'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const missingProfileFields: string[] = []
  if (!profile.position) missingProfileFields.push('Pozice')
  if (!profile.email) missingProfileFields.push('Kontaktní email')
  if (!profile.phone) missingProfileFields.push('Telefon')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emailový podpis</CardTitle>
        <CardDescription>
          Vyberte šablonu, případně banner z knihovny, a zkopírujte si HTML podpis do svého
          emailového klienta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {missingProfileFields.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              {'Pro úplný podpis doplňte v sekci „Osobní údaje" tyto údaje: '}
              <strong>{missingProfileFields.join(', ')}</strong>.
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label>Šablona</Label>
          <RadioGroup
            value={template}
            onValueChange={(value) => setTemplate(value as SignatureTemplate)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Label
              htmlFor="tpl-banner"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem id="tpl-banner" value="banner" className="mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">S bannerem</p>
                <p className="text-xs text-muted-foreground">
                  Logo, údaje, sezónní banner s CTA.
                </p>
              </div>
            </Label>
            <Label
              htmlFor="tpl-compact"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem id="tpl-compact" value="compact" className="mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Kompaktní bez banneru</p>
                <p className="text-xs text-muted-foreground">
                  Jednořádkový textový podpis pro rychlou komunikaci.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {template === 'banner' && (
          <div className="space-y-3">
            <Label>Banner</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setBannerId(null)}
                className={`text-left rounded-md border p-3 hover:bg-accent transition-colors ${
                  !bannerId ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="bg-muted aspect-[4/1] rounded mb-2 flex items-center justify-center">
                  {evergreenBanner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={evergreenBanner.image_url}
                      alt={evergreenBanner.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Žádný evergreen</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">Evergreen (výchozí)</span>
                </div>
              </button>
              {banners
                .filter((b) => !b.is_evergreen)
                .map((banner) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setBannerId(banner.id)}
                    className={`text-left rounded-md border p-3 hover:bg-accent transition-colors ${
                      bannerId === banner.id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="bg-muted aspect-[4/1] rounded mb-2 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.image_url}
                        alt={banner.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm font-medium truncate">{banner.name}</p>
                  </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {banners.length === 0 ? 'V knihovně zatím nejsou žádné bannery.' : 'Chcete přidat sezónní banner nebo upravit evergreen?'}{' '}
              <a
                href="/admin/nastaveni/email-bannery"
                className="text-primary underline-offset-2 hover:underline"
              >
                Spravovat knihovnu bannerů →
              </a>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Náhled</Label>
            {selectedBanner && template === 'banner' && (
              <Badge variant="outline" className="font-normal">
                Banner: {selectedBanner.name}
              </Badge>
            )}
          </div>
          <div className="border rounded-md overflow-hidden bg-white">
            <iframe
              srcDoc={previewDoc}
              sandbox=""
              title="Náhled podpisu"
              className="w-full"
              style={{ height: template === 'banner' ? '500px' : '140px' }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Zkopírovat pro Gmail / Outlook
          </Button>
          <Button variant="secondary" onClick={handleCopyPipedrive}>
            <Copy className="mr-2 h-4 w-4" />
            Zkopírovat pro Pipedrive
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Stáhnout .htm
          </Button>
          <Button variant="outline" onClick={handleSendTest} disabled={sendingTest}>
            {sendingTest ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Poslat testovací email
          </Button>
        </div>

        <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Jak vložit podpis do emailového klienta
              <ChevronDown
                className={`h-4 w-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">Gmail (web)</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{'Zkopírujte podpis tlačítkem „Zkopírovat pro Gmail / Outlook".'}</li>
                <li>V Gmailu otevřete Nastavení → Zobrazit všechna nastavení → záložka Obecné.</li>
                <li>Sjeďte k sekci Podpis a vytvořte nový (nebo upravte stávající).</li>
                <li>Klikněte do editoru podpisu a vložte (Cmd+V / Ctrl+V).</li>
                <li>Uložte změny dole na stránce.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Outlook (web)</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{'Zkopírujte podpis tlačítkem „Zkopírovat pro Gmail / Outlook".'}</li>
                <li>V Outlooku otevřete Nastavení → Pošta → Vytvořit a odpovědět.</li>
                <li>Do editoru podpisu vložte (Cmd+V / Ctrl+V).</li>
                <li>Uložte.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Outlook (desktop)</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{'Stáhněte soubor tlačítkem „Stáhnout .htm".'}</li>
                <li>Otevřete jeho obsah v prohlížeči, označte vše (Ctrl+A) a zkopírujte.</li>
                <li>
                  V Outlooku otevřete Soubor → Možnosti → Pošta → Podpisy a do editoru vložte
                  (Ctrl+V).
                </li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Apple Mail</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{'Zkopírujte podpis tlačítkem „Zkopírovat pro Gmail / Outlook".'}</li>
                <li>Otevřete Mail → Nastavení → Podpisy.</li>
                <li>Vyberte účet a vytvořte nový podpis. Vložte ho do editoru (Cmd+V).</li>
                <li>Zavřete okno — uloží se automaticky.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Pipedrive</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{'Zkopírujte podpis tlačítkem „Zkopírovat pro Pipedrive".'}</li>
                <li>V Pipedrive otevřete Nastavení → E-mailová synchronizace → Podpis → Přidat e-mailový podpis.</li>
                <li>Vyplňte název podpisu, klikněte do editoru a vložte (Cmd+V / Ctrl+V).</li>
                <li>{'Pokud se logo nebo banner nezobrazí, použijte tlačítko Obrázek v editoru a vložte URL z náhledu podpisu — Pipedrive některé obrázky strippuje při paste.'}</li>
                <li>Uložte.</li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
