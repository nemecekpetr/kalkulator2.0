import { Suspense } from 'react'
import { getMyProfile } from '@/app/actions/profile-actions'

export const dynamic = 'force-dynamic'
import { ProfileForm } from '@/components/admin/profile-form'
import { ChangePasswordForm } from '@/components/admin/change-password-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

async function ProfileContent() {
  const { profile, error } = await getMyProfile()

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Nepodařilo se načíst profil</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Osobní údaje</CardTitle>
              <CardDescription>
                Tyto údaje se zobrazují v nabídkách jako kontakt na bazénového specialistu
              </CardDescription>
            </div>
            <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
              {profile.role === 'admin' ? 'Administrátor' : 'Uživatel'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Změna hesla</CardTitle>
          <CardDescription>
            Změňte si přihlašovací heslo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Můj profil</h1>
        <p className="text-muted-foreground">
          Spravujte své osobní údaje a přihlašovací údaje
        </p>
      </div>

      <Separator />

      <Suspense fallback={<ProfileLoading />}>
        <ProfileContent />
      </Suspense>
    </div>
  )
}
