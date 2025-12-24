'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Waves,
  FileSpreadsheet,
  ShoppingBag,
  LogOut,
  UsersRound,
  UserCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/supabase/types'

interface NavItem {
  name: string
  href: string
  icon: typeof BarChart3
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
  { name: 'Konfigurace', href: '/admin/konfigurace', icon: Waves },
  { name: 'Nabídky', href: '/admin/nabidky', icon: FileSpreadsheet },
  { name: 'Produkty', href: '/admin/produkty', icon: ShoppingBag },
  { name: 'Uživatelé', href: '/admin/uzivatele', icon: UsersRound, adminOnly: true },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserRole(profile.role as UserRole)
        }
      }
    }
    fetchUserRole()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter navigation based on role
  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || userRole === 'admin'
  )

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-[#01384B] via-[#025a6e] to-[#48A9A6] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-10 w-60 h-60 bg-[#48A9A6]/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex h-20 items-center justify-center px-6 border-b border-white/10">
          <Link href="/admin/dashboard">
            <Image
              src="/logo-blue-gradient.svg"
              alt="Rentmil"
              width={200}
              height={75}
              priority
              className="object-contain w-auto h-12 brightness-0 invert"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 px-4 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white hover:shadow-md'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-white/20'
                    : 'bg-white/5 group-hover:bg-white/10'
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Mascot */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <div className="animate-float">
            <Image
              src="/maskot-holding.png"
              alt="Rentmil maskot"
              width={210}
              height={210}
              className="object-contain opacity-90 drop-shadow-lg"
            />
          </div>
          <p className="mt-4 text-xl font-semibold text-white/90 italic text-center leading-tight">
            „Vy zenujete,<br />my bazénujeme."
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 p-4 border-t border-white/10 space-y-2">
          <Link
            href="/admin/profil"
            className={cn(
              'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              pathname === '/admin/profil'
                ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg transition-all duration-200',
              pathname === '/admin/profil'
                ? 'bg-white/20'
                : 'bg-white/5 group-hover:bg-white/10'
            )}>
              <UserCircle className="w-5 h-5" />
            </div>
            Můj profil
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 px-4 py-3 h-auto rounded-xl"
            onClick={handleLogout}
          >
            <div className="p-2 rounded-lg bg-white/5 mr-3">
              <LogOut className="w-5 h-5" />
            </div>
            Odhlásit se
          </Button>
        </div>
      </div>
    </aside>
  )
}
