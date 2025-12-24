'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  activateUser,
  deactivateUser,
  resetUserPassword,
  deleteUser,
} from '@/app/actions/user-actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserDialog } from './user-dialog'
import type { UserProfile } from '@/lib/supabase/types'
import {
  MoreHorizontal,
  UserPlus,
  Search,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  Pencil,
} from 'lucide-react'

interface UsersTableProps {
  users: UserProfile[]
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase()
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    )
  })

  const handleToggleActive = async (user: UserProfile) => {
    const action = user.active ? deactivateUser : activateUser
    const result = await action(user.id)

    if (result.success) {
      toast.success(user.active ? 'Uživatel deaktivován' : 'Uživatel aktivován')
      router.refresh()
    } else {
      toast.error(result.error || 'Operace selhala')
    }
  }

  const handleResetPassword = async () => {
    if (!userToResetPassword || !newPassword) return

    const result = await resetUserPassword(userToResetPassword.id, newPassword)

    if (result.success) {
      toast.success('Heslo bylo resetováno')
      setResetPasswordOpen(false)
      setNewPassword('')
      setUserToResetPassword(null)
    } else {
      toast.error(result.error || 'Nepodařilo se resetovat heslo')
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    const result = await deleteUser(userToDelete.id)

    if (result.success) {
      toast.success('Uživatel byl smazán')
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Nepodařilo se smazat uživatele')
    }
  }

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hledat uživatele..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Přidat uživatele
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Vytvořen</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {search ? 'Žádní uživatelé nenalezeni' : 'Zatím nejsou žádní uživatelé'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Uživatel'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? 'default' : 'destructive'}>
                      {user.active ? 'Aktivní' : 'Neaktivní'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), 'd. M. yyyy', { locale: cs })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Akce</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Upravit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setUserToResetPassword(user)
                            setResetPasswordOpen(true)
                          }}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Resetovat heslo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                          {user.active ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Deaktivovat
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Aktivovat
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setUserToDelete(user)
                            setDeleteConfirmOpen(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Dialog */}
      <UserDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        user={editingUser}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat uživatele {userToDelete?.full_name}? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetovat heslo</AlertDialogTitle>
            <AlertDialogDescription>
              Zadejte nové heslo pro uživatele {userToResetPassword?.full_name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Nové heslo (min. 8 znaků)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewPassword('')}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={newPassword.length < 8}
            >
              Resetovat heslo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
