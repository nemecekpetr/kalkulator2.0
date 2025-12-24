'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Circle, Droplets, Ruler, Palette, Footprints,
  Settings, Lightbulb, Waves, Thermometer, Home,
  User, Mail, Phone, MapPin, Check, Clock
} from 'lucide-react'
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
    submitError,
    setSubmitting,
    setSubmitted,
    setSubmitError
  } = useConfiguratorStore()

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      // Prepare form data
      const formData = {
        shape: shape!,
        type: type!,
        dimensions: {
          diameter: dimensions?.diameter,
          width: dimensions?.width,
          length: dimensions?.length,
          depth: dimensions?.depth!
        },
        color: color!,
        stairs: stairs ?? 'none',
        technology: technology!,
        lighting: lighting ?? 'none',
        counterflow: counterflow ?? 'none',
        waterTreatment: waterTreatment!,
        heating: heating!,
        roofing: roofing!,
        contact: {
          name: contact!.name!,
          email: contact!.email!,
          phone: contact!.phone!,
          address: contact?.address
        },
        turnstileToken: turnstileToken ?? undefined
      }

      const result = await submitConfiguration(formData)

      if (result.success) {
        setSubmitted(true)
      } else {
        setSubmitError(result.message)
      }
    } catch (error) {
      console.error('Submit error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
      setSubmitError(`Došlo k neočekávané chybě: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <StepLayout title="" description="">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#48A9A6] to-[#01384B] flex items-center justify-center shadow-lg"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-display font-bold text-[#01384B] mb-4"
          >
            Děkujeme za Vaši poptávku!
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-lg mx-auto mb-6"
          >
            <p className="text-green-800 text-lg mb-2">
              Vaši konfiguraci jsme úspěšně přijali.
            </p>
            <p className="text-green-700">
              Shrnutí jsme Vám odeslali na e-mail{' '}
              <strong className="text-green-900">{contact?.email}</strong>
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#48A9A6]/10 rounded-full text-[#01384B]"
          >
            <Clock className="w-5 h-5 text-[#48A9A6]" />
            <span className="font-medium">Ozveme se Vám do 24 hodin s cenovou kalkulací</span>
          </motion.div>
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
          {/* Error message */}
          {submitError && (
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
                  icon={<Lightbulb className="w-4 h-4" />}
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

          {/* What happens next - prominent section */}
          <Card className="border-2 border-[#48A9A6] bg-gradient-to-br from-[#48A9A6]/5 to-[#01384B]/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#01384B]">
                <Clock className="w-5 h-5 text-[#48A9A6]" />
                Co bude následovat po odeslání?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#48A9A6] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-[#01384B]">Potvrzení na e-mail</p>
                    <p className="text-sm text-muted-foreground">
                      Ihned po odeslání obdržíte shrnutí Vaší konfigurace na e-mail
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#48A9A6] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-[#01384B]">Cenová kalkulace do 24 hodin</p>
                    <p className="text-sm text-muted-foreground">
                      Náš specialista Vám připraví detailní cenovou nabídku na míru
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#48A9A6] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-[#01384B]">Osobní konzultace</p>
                    <p className="text-sm text-muted-foreground">
                      Budeme Vás kontaktovat pro upřesnění detailů a zodpovězení dotazů
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Turnstile widget */}
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onVerify={handleTurnstileVerify}
              />
            </div>
          )}

          {/* Price note */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-[#FF8621]/10 to-[#ED6663]/10 border border-[#FF8621]/20">
            <h4 className="font-semibold text-[#01384B] mb-1">
              Proč se nezobrazuje cena?
            </h4>
            <p className="text-sm text-muted-foreground">
              Cena závisí na dopravě, podloží a aktuální ceně materiálu.
              Přesnou nabídku Vám spočítáme ručně, abychom garantovali její platnost.
              Kalkulaci obdržíte do 24 hodin.
            </p>
          </div>
        </div>
      </form>
    </StepLayout>
  )
}
