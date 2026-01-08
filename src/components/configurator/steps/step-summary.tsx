'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Circle, Droplets, Ruler, Palette, Footprints,
  Settings, Lightbulb as LightbulbIcon, Waves, Thermometer, Home,
  User, Mail, Phone, MapPin, Check, Clock,
  Plus, Edit2, HelpCircle, ChevronRight, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfiguratorStore } from '@/stores/configurator-store'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getLightingLabel,
  getCounterflowLabel,
  getWaterTreatmentLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions
} from '@/lib/constants/configurator'
import { StepLayout } from '../step-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Turnstile } from '@/components/turnstile'
import { submitConfiguration } from '@/app/actions/submit-configuration'

// Constants
const ADVICE_BLOG_URL = 'https://www.rentmil.cz/radime-vam?e-filter-1036ab9-post_tag=jak-vybrat'
const ICON_GRADIENT_CLASSES = 'bg-gradient-to-br from-[#48A9A6] to-[#01384B]'

interface SummaryRowProps {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}

function SummaryRow({ icon, label, value }: SummaryRowProps) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function StepSummary() {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const {
    shape,
    type,
    dimensions,
    color,
    stairs,
    technology,
    lighting,
    counterflow,
    waterTreatment,
    heating,
    roofing,
    contact,
    isSubmitted,
    isDuplicate,
    submitError,
    setSubmitting,
    setSubmitted,
    setDuplicate,
    setSubmitError,
    setStep,
    reset
  } = useConfiguratorStore()

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  // Focus management for accessibility - focus the thank you content when submitted
  const thankYouRef = useRef<HTMLDivElement>(null)
  const [mascotError, setMascotError] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)

  useEffect(() => {
    if (isSubmitted && thankYouRef.current) {
      // Small delay to allow animations to start
      setTimeout(() => {
        thankYouRef.current?.focus()
      }, 100)
    }
  }, [isSubmitted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      // Validate required fields before submission
      if (!shape || !type || !dimensions?.depth || !color || !technology ||
          !waterTreatment || !heating || !roofing ||
          !contact?.name || !contact?.email || !contact?.phone) {
        setSubmitError('Chybí povinné údaje. Vraťte se a zkontrolujte všechny kroky.')
        setSubmitting(false)
        return
      }

      // Prepare form data with validated values
      const formData = {
        shape,
        type,
        dimensions: {
          diameter: dimensions.diameter,
          width: dimensions.width,
          length: dimensions.length,
          depth: dimensions.depth
        },
        color,
        stairs: stairs ?? 'none',
        technology,
        lighting: lighting ?? 'none',
        counterflow: counterflow ?? 'none',
        waterTreatment,
        heating,
        roofing,
        contact: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          address: contact.address
        },
        turnstileToken: turnstileToken ?? undefined
      }

      const result = await submitConfiguration(formData)

      if (result.success) {
        setSubmitted(true)
        if (result.isDuplicate) {
          setDuplicate(true)
        }
      } else {
        setSubmitError(result.message)
      }
    } catch (error) {
      console.error('Submit error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'

      // Detect "Server Action not found" error - happens after deployment/rebuild
      // when client has cached old JS with outdated action ID
      if (errorMessage.includes('was not found on the server') ||
          errorMessage.includes('Server Action')) {
        setNeedsRefresh(true)
        setSubmitError(null)
      } else {
        setSubmitError(`Došlo k neočekávané chybě: ${errorMessage}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <StepLayout title="" description="">
        <motion.div
          ref={thankYouRef}
          tabIndex={-1}
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[520px] mx-auto outline-none"
        >
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            {/* Hero s maskotem */}
            <div className="bg-gradient-to-br from-[#01384B] via-[#025a6e] to-[#48A9A6] px-8 py-10 text-center relative overflow-hidden">
              {/* Subtle water effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(72,169,166,0.3)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(255,134,33,0.15)_0%,transparent_40%)] pointer-events-none" />

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="relative z-10 w-[180px] h-[180px] mx-auto mb-5"
              >
                {!mascotError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/images/mascot/hurray.png"
                    alt="Bazénový mistr gratuluje k úspěšnému odeslání konfigurace"
                    className="w-full h-full object-contain drop-shadow-2xl animate-float"
                    onError={() => setMascotError(true)}
                  />
                ) : (
                  // Fallback: checkmark icon if mascot fails to load
                  <div className={`w-full h-full rounded-full ${ICON_GRADIENT_CLASSES} flex items-center justify-center`}>
                    <Check className="w-20 h-20 text-white" />
                  </div>
                )}
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white text-xl font-bold relative z-10 drop-shadow-md"
              >
                Vy zenujete, my bazénujeme!
              </motion.p>
            </div>

            {/* Content */}
            <div className="p-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className={`text-2xl font-bold text-center mb-2 ${isDuplicate ? 'text-red-600' : 'text-[#01384B]'}`}>
                  {isDuplicate ? 'Konfigurace byla již dříve odeslána' : 'Konfigurace přijata'}
                </h2>
                <p className="text-slate-500 text-center mb-6">
                  {isDuplicate ? (
                    <>
                      Tuto konfiguraci jste již odeslali. Potvrzení najdete na{' '}
                      <span className="text-[#48A9A6] font-semibold">{contact?.email}</span>
                    </>
                  ) : (
                    <>
                      Potvrzení jsme odeslali na{' '}
                      <span className="text-[#48A9A6] font-semibold">{contact?.email}</span>
                    </>
                  )}
                </p>
              </motion.div>

              {/* Timeline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-0 mb-6"
              >
                {isDuplicate ? (
                  // Duplicate submission - show info message
                  <div className="flex items-start gap-3.5 py-3.5 bg-amber-50 rounded-xl px-4 -mx-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-[#01384B] text-[15px]">Zkontrolujte svůj e-mail</p>
                      <p className="text-slate-500 text-sm">
                        Potvrzení konfigurace jsme vám již dříve odeslali.
                        Pokud ho nemůžete najít, zkontrolujte složku spam.
                      </p>
                    </div>
                  </div>
                ) : (
                  // New submission - show normal timeline
                  <>
                    <div className="flex items-start gap-3.5 py-3.5 border-b border-slate-100">
                      <div className={`w-9 h-9 rounded-xl ${ICON_GRADIENT_CLASSES} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#01384B] text-[15px]">E-mail odeslán</p>
                        <p className="text-slate-500 text-sm">Shrnutí konfigurace máte ve schránce</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 py-3.5 border-b border-slate-100">
                      <div className={`w-9 h-9 rounded-xl ${ICON_GRADIENT_CLASSES} flex items-center justify-center flex-shrink-0`}>
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#01384B] text-[15px]">Cenová nabídka do 24 hodin</p>
                        <p className="text-slate-500 text-sm">Náš specialista připraví kalkulaci na míru</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 py-3.5">
                      <div className={`w-9 h-9 rounded-xl ${ICON_GRADIENT_CLASSES} flex items-center justify-center flex-shrink-0`}>
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#01384B] text-[15px]">Zavoláme vám</p>
                        <p className="text-slate-500 text-sm">Pro upřesnění detailů a zodpovězení dotazů</p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-6" />

              {/* Advice section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-center"
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Mezitím si přečtěte
                </p>
                <a
                  href={ADVICE_BLOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-gradient-to-r from-[#FF8621] to-[#ED6663] rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                >
                  <h4 className="text-lg font-bold text-white mb-1">
                    Jak vybrat ten správný bazén?
                  </h4>
                  <p className="text-white/90 text-sm mb-3">
                    Tipy a rady od našich odborníků, které vám pomohou s výběrem
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm group-hover:gap-3 transition-all duration-300">
                    Přečíst články
                    <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </a>
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-5 flex flex-col sm:flex-row gap-3"
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false)
                    setDuplicate(false)
                    setSubmitError(null)
                    setStep(1)
                  }}
                  className="flex-1 gap-2 h-12 border-slate-200 text-slate-500 hover:border-[#48A9A6] hover:text-[#48A9A6]"
                >
                  <Edit2 className="w-4 h-4" />
                  Upravit
                </Button>
                <Button
                  onClick={() => {
                    try {
                      reset()
                      setStep(1)
                    } catch (error) {
                      console.error('Reset failed:', error)
                      // Fallback: force page reload
                      window.location.href = '/'
                    }
                  }}
                  className="flex-1 gap-2 h-12 bg-gradient-to-r from-[#48A9A6] to-[#01384B] hover:from-[#48A9A6]/90 hover:to-[#01384B]/90"
                >
                  <Plus className="w-4 h-4" />
                  Nová konfigurace
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </StepLayout>
    )
  }

  return (
    <StepLayout
      title="Shrnutí Vaší konfigurace"
      description="Zkontrolujte údaje před odesláním"
    >
      <form id="configurator-form" onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Refresh needed message - shown when server action ID mismatch */}
          {needsRefresh && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#01384B] mb-1">
                    Stránka potřebuje obnovit
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Aplikace byla aktualizována. Pro odeslání konfigurace je potřeba obnovit stránku.
                    Vaše data zůstanou zachována.
                  </p>
                  <Button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Obnovit stránku
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {submitError && !needsRefresh && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              {submitError}
            </div>
          )}

          {/* Pool configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Droplets className="w-5 h-5 text-[#48A9A6]" />
                Konfigurace bazénu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <SummaryRow
                icon={<Circle className="w-4 h-4" />}
                label="Tvar"
                value={shape ? getShapeLabel(shape) : null}
              />
              <SummaryRow
                icon={<Droplets className="w-4 h-4" />}
                label="Typ"
                value={type ? getTypeLabel(type) : null}
              />
              <SummaryRow
                icon={<Ruler className="w-4 h-4" />}
                label="Rozměry"
                value={shape && dimensions ? formatDimensions(shape, dimensions) : null}
              />
              <SummaryRow
                icon={<Palette className="w-4 h-4" />}
                label="Barva"
                value={color ? getColorLabel(color) : null}
              />
              {stairs && stairs !== 'none' && shape !== 'circle' && (
                <SummaryRow
                  icon={<Footprints className="w-4 h-4" />}
                  label="Schodiště"
                  value={getStairsLabel(stairs)}
                />
              )}
              <SummaryRow
                icon={<Settings className="w-4 h-4" />}
                label="Technologie"
                value={technology ? getTechnologyLabel(technology) : null}
              />

              <Separator className="my-3" />

              {/* Accessories */}
              {lighting && lighting !== 'none' && (
                <SummaryRow
                  icon={<LightbulbIcon className="w-4 h-4" />}
                  label="Osvětlení"
                  value={getLightingLabel(lighting)}
                />
              )}
              {counterflow && counterflow !== 'none' && (
                <SummaryRow
                  icon={<Waves className="w-4 h-4" />}
                  label="Protiproud"
                  value={getCounterflowLabel(counterflow)}
                />
              )}
              <SummaryRow
                icon={<Droplets className="w-4 h-4" />}
                label="Úprava vody"
                value={waterTreatment ? getWaterTreatmentLabel(waterTreatment) : null}
              />

              <Separator className="my-3" />

              {/* Heating & Roofing */}
              {heating && heating !== 'none' && (
                <SummaryRow
                  icon={<Thermometer className="w-4 h-4" />}
                  label="Ohřev"
                  value={getHeatingLabel(heating)}
                />
              )}
              {roofing && roofing !== 'none' && (
                <SummaryRow
                  icon={<Home className="w-4 h-4" />}
                  label="Zastřešení"
                  value={getRoofingLabel(roofing)}
                />
              )}
            </CardContent>
          </Card>

          {/* Contact information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-[#01384B]" />
                Kontaktní údaje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <SummaryRow
                icon={<User className="w-4 h-4" />}
                label="Jméno"
                value={contact?.name}
              />
              <SummaryRow
                icon={<Mail className="w-4 h-4" />}
                label="E-mail"
                value={contact?.email}
              />
              <SummaryRow
                icon={<Phone className="w-4 h-4" />}
                label="Telefon"
                value={contact?.phone}
              />
              {contact?.address && (
                <SummaryRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="Adresa"
                  value={contact.address}
                />
              )}
            </CardContent>
          </Card>

          {/* Turnstile widget - security verification */}
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <Card className={`p-4 ${turnstileToken ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-[#01384B]">
                  {turnstileToken ? '✓ Ověření dokončeno' : 'Pro odeslání dokončete ověření:'}
                </p>
                {!turnstileToken && (
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    onVerify={handleTurnstileVerify}
                  />
                )}
              </div>
            </Card>
          )}

          {/* Price note */}
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-[#01384B] text-sm mb-1">Proč se nezobrazuje cena?</h4>
                <p className="text-sm text-slate-600">
                  Cena závisí na dopravě, podloží a aktuální ceně materiálu.
                  Přesnou nabídku Vám spočítáme ručně, abychom garantovali její platnost.
                  Kalkulaci obdržíte do 24 hodin.
                </p>
              </div>
            </div>
          </Card>

          {/* What happens next - info section */}
          <Card className="border border-[#48A9A6]/30 bg-gradient-to-br from-[#48A9A6]/5 to-[#01384B]/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[#01384B]">
                <Clock className="w-4 h-4 text-[#48A9A6]" />
                Co bude následovat po odeslání?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#48A9A6] flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-[#01384B]">Potvrzení na e-mail</p>
                    <p className="text-xs text-muted-foreground">
                      Ihned obdržíte shrnutí konfigurace
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#48A9A6] flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-[#01384B]">Cenová kalkulace do 24 hodin</p>
                    <p className="text-xs text-muted-foreground">
                      Specialista připraví nabídku na míru
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#48A9A6] flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-[#01384B]">Osobní konzultace</p>
                    <p className="text-xs text-muted-foreground">
                      Kontaktujeme Vás pro upřesnění detailů
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </form>
    </StepLayout>
  )
}
