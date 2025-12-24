'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Package,
  Users
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/lib/supabase/types'

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Konfigurace', href: '/admin/konfigurace', icon: ClipboardList },
  { name: 'Nabídky', href: '/admin/nabidky', icon: FileText },
  { name: 'Produkty', href: '/admin/produkty', icon: Package },
  { name: 'Uživatelé', href: '/admin/uzivatele', icon: Users, adminOnly: true },
]

export function AdminHeader() {
  const [open, setOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single() as { data: UserProfile | null }
        if (profile) {
          setUserProfile(profile)
        }
      }
    }
    fetchUserProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard'
    if (pathname.includes('/konfigurace')) return 'Konfigurace'
    if (pathname.includes('/nabidky')) return 'Nabídky'
    if (pathname.includes('/produkty')) return 'Produkty'
    if (pathname.includes('/uzivatele')) return 'Uživatelé'
    if (pathname.includes('/profil')) return 'Můj profil'
    return 'Administrace'
  }

  // Filter navigation based on role
  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || userProfile?.role === 'admin'
  )

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-[#01384B]">
          <div className="flex h-16 items-center px-6 border-b border-white/10">
            <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <Image
                src="/logo-blue-gradient.svg"
                alt="Rentmil"
                width={140}
                height={52}
                priority
                className="object-contain h-8 w-auto brightness-0 invert"
              />
            </Link>
          </div>
          <nav className="px-4 py-6 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="px-4 py-4 border-t border-white/10">
            <Link
              href="/admin/profil"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/admin/profil'
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <User className="w-5 h-5" />
              Můj profil
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="text-lg font-semibold flex-1">{getPageTitle()}</h1>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 rounded-full px-2">
            <div className="w-8 h-8 rounded-full bg-[#01384B] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {userProfile && (
              <span className="hidden sm:inline text-sm font-medium">
                {userProfile.full_name}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/admin/profil">
              <User className="w-4 h-4 mr-2" />
              Můj profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Odhlásit se
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
