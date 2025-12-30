'use client'

import { User, Mail, Phone, MapPin, Shield } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { StepLayout } from '../step-layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { isValidEmail, isValidPhone } from '@/lib/validations/contact'

export function StepContact() {
  const contact = useConfiguratorStore((state) => state.contact)
  const setContact = useConfiguratorStore((state) => state.setContact)

  const handleChange = (field: string, value: string) => {
    setContact({
      ...contact,
      [field]: value
    })
  }

  const emailError = contact?.email && !isValidEmail(contact.email)
  const phoneError = contact?.phone && !isValidPhone(contact.phone)

  return (
    <StepLayout
      title="Vaše kontaktní údaje"
      description="Zadejte údaje pro zaslání nezávazné kalkulace"
    >
      <div className="space-y-6">
        <Card className="p-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Celé jméno *
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Jan Novák"
              value={contact?.name ?? ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="h-12"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              E-mail *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jan.novak@email.cz"
              value={contact?.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`h-12 ${emailError ? 'border-destructive' : ''}`}
            />
            {emailError && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">
                Zadejte platný e-mail
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Telefon *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+420 123 456 789"
              value={contact?.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`h-12 ${phoneError ? 'border-destructive' : ''}`}
            />
            {phoneError && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">
                Zadejte platné telefonní číslo
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Adresa instalace (nepovinné)
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="Ulice, Město"
              value={contact?.address ?? ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="h-12"
            />
          </div>
        </Card>

        {/* Privacy note */}
        <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h4 className="font-semibold text-[#01384B] text-sm mb-1">Vaše údaje jsou v bezpečí</h4>
              <p className="text-sm text-slate-600">
                Údaje použijeme pouze pro zaslání kalkulace a kontaktování naším specialistou.
                Nikdy je neposkytneme třetím stranám.
              </p>
            </div>
          </div>
        </Card>

      </div>
    </StepLayout>
  )
}
