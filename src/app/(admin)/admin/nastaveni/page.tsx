import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, UsersRound, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

interface SettingsLink {
  name: string
  description: string
  href: string
  icon: typeof ShoppingBag
  adminOnly?: boolean
}

const settingsLinks: SettingsLink[] = [
  {
    name: 'Produkty',
    description: 'Sprava produktu a ceniku',
    href: '/admin/nastaveni/produkty',
    icon: ShoppingBag,
  },
  {
    name: 'Uzivatele',
    description: 'Sprava uzivatelu a pristupu',
    href: '/admin/nastaveni/uzivatele',
    icon: UsersRound,
    adminOnly: true,
  },
]

export default async function SettingsPage() {
  const isAdmin = await checkAdmin()

  const filteredLinks = settingsLinks.filter(
    (link) => !link.adminOnly || isAdmin
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Nastaveni</h1>
        <p className="text-muted-foreground">
          Sprava systemu a konfigurace
        </p>
      </div>

      {/* Settings Links */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <link.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{link.name}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
