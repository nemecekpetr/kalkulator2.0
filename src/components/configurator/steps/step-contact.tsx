'use client'

import { User, Mail, Phone, MapPin, Shield } from 'lucide-react'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { StepLayout } from '../step-layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export function StepContact() {
  const contact = useConfiguratorStore((state) => state.contact)
  const setContact = useConfiguratorStore((state) => state.setContact)

  const handleChange = (field: string, value: string) => {
    setContact({
      ...contact,
      [field]: value
    })
  }

  // Simple validation helpers
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isValidPhone = (phone: string) => {
    return phone.replace(/[\s\-\+]/g, '').length >= 9
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
              <p className="text-sm text-destructive">Zadejte platný e-mail</p>
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
              <p className="text-sm text-destructive">Zadejte platné telefonní číslo</p>
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
        <div className="flex items-start gap-3 p-4 rounded-lg bg-[#48A9A6]/5 border border-[#48A9A6]/20">
          <Shield className="w-5 h-5 text-[#48A9A6] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[#01384B]">Vaše údaje jsou v bezpečí</p>
            <p className="text-muted-foreground mt-1">
              Údaje použijeme pouze pro zaslání kalkulace a kontaktování naším specialistou.
              Nikdy je neposkytneme třetím stranám.
            </p>
          </div>
        </div>

      </div>
    </StepLayout>
  )
}
