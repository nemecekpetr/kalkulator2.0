import { Suspense } from 'react'
import { getUsers } from '@/app/actions/user-actions'
import { requireAdmin } from '@/lib/auth/require-role'
import { UsersTable } from '@/components/admin/users-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

async function UsersContent() {
  const { users, error } = await getUsers()

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    )
  }

  return <UsersTable users={users} />
}

function UsersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

export default async function Uzivatele() {
  // Server-side admin check
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Správa uživatelů</h1>
        <p className="text-muted-foreground">
          Přidávejte a spravujte uživatele systému
        </p>
      </div>

      <Separator />

      <Suspense fallback={<UsersLoading />}>
        <UsersContent />
      </Suspense>
    </div>
  )
}
