'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { updateMyProfile } from '@/app/actions/profile-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserProfile } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  email: z.string().email('Neplatný email').optional().or(z.literal('')),
  phone: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  profile: UserProfile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name,
      email: profile.email || '',
      phone: profile.phone || '',
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      const result = await updateMyProfile({
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
      })

      if (result.success) {
        toast.success('Profil byl aktualizován')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se aktualizovat profil')
      }
    } catch {
      toast.error('Nepodařilo se aktualizovat profil')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Jméno a příjmení *</Label>
          <Input
            id="full_name"
            {...register('full_name')}
            placeholder="Jan Novák"
          />
          {errors.full_name && (
            <p className="text-sm text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Kontaktní email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="jan.novak@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Zobrazuje se v nabídkách. Může být jiný než přihlašovací email.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+420 123 456 789"
          />
          <p className="text-xs text-muted-foreground">
            Zobrazuje se v nabídkách jako kontakt na specialistu.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Uložit změny
        </Button>
      </div>
    </form>
  )
}
