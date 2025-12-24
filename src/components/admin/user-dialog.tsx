'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createUser, updateUser } from '@/app/actions/user-actions'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserProfile, UserRole } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

const createUserSchema = z.object({
  email: z.string().email('Neplatný email'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků'),
  full_name: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'user']),
})

const editUserSchema = z.object({
  full_name: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  email: z.string().email('Neplatný email').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['admin', 'user']),
})

type CreateUserFormData = z.infer<typeof createUserSchema>
type EditUserFormData = z.infer<typeof editUserSchema>

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile | null
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!user

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'user',
    },
  })

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      role: 'user',
    },
  })

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        editForm.reset({
          full_name: user.full_name,
          email: user.email || '',
          phone: user.phone || '',
          role: user.role,
        })
      } else {
        createForm.reset({
          email: '',
          password: '',
          full_name: '',
          phone: '',
          role: 'user',
        })
      }
    }
  }, [open, user, createForm, editForm])

  const handleCreate = async (data: CreateUserFormData) => {
    setIsSubmitting(true)
    try {
      const result = await createUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role as UserRole,
      })

      if (result.success) {
        toast.success('Uživatel byl vytvořen')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se vytvořit uživatele')
      }
    } catch {
      toast.error('Nepodařilo se vytvořit uživatele')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: EditUserFormData) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const result = await updateUser(user.id, {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role as UserRole,
      })

      if (result.success) {
        toast.success('Uživatel byl aktualizován')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se aktualizovat uživatele')
      }
    } catch {
      toast.error('Nepodařilo se aktualizovat uživatele')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = isEditing ? handleEdit : handleCreate
  const activeForm = isEditing ? editForm : createForm

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Upravit uživatele' : 'Nový uživatel'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Upravte údaje uživatele'
              : 'Vytvořte nového uživatele systému'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={activeForm.handleSubmit(onSubmit as never)} className="space-y-4">
          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Přihlašovací email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...createForm.register('email')}
                  placeholder="jan.novak@example.com"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Heslo *</Label>
                <Input
                  id="password"
                  type="password"
                  {...createForm.register('password')}
                  placeholder="Min. 8 znaků"
                />
                {createForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Jméno a příjmení *</Label>
            <Input
              id="full_name"
              {...(isEditing ? editForm.register('full_name') : createForm.register('full_name'))}
              placeholder="Jan Novák"
            />
            {(isEditing ? editForm.formState.errors.full_name : createForm.formState.errors.full_name) && (
              <p className="text-sm text-destructive">
                {(isEditing ? editForm.formState.errors.full_name?.message : createForm.formState.errors.full_name?.message)}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="edit_email">Kontaktní email</Label>
              <Input
                id="edit_email"
                type="email"
                {...editForm.register('email')}
                placeholder="jan.novak@example.com"
              />
              {editForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.email.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              {...(isEditing ? editForm.register('phone') : createForm.register('phone'))}
              placeholder="+420 123 456 789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={isEditing ? editForm.watch('role') : createForm.watch('role')}
              onValueChange={(value) => isEditing ? editForm.setValue('role', value as UserRole) : createForm.setValue('role', value as UserRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte roli" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Uživatel</SelectItem>
                <SelectItem value="admin">Administrátor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Uložit' : 'Vytvořit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
