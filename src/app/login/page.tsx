'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Přihlášení selhalo', {
          description: 'Nesprávný e-mail nebo heslo',
        })
        return
      }

      toast.success('Úspěšně přihlášeno')
      router.push(redirectTo)
      router.refresh()
    } catch {
      toast.error('Neočekávaná chyba')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero with mascot */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#01384B] via-[#025a6e] to-[#48A9A6] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#48A9A6]/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logo-blue-gradient.svg"
              alt="Rentmil"
              width={320}
              height={120}
              priority
              className="object-contain brightness-0 invert"
            />
          </div>

          {/* Mascot */}
          <div className="relative animate-float">
            <Image
              src="/maskot-hq.png"
              alt="Bazénový mistr"
              width={320}
              height={320}
              priority
              className="object-contain drop-shadow-2xl"
            />
          </div>

          {/* Tagline */}
          <div className="mt-8 text-center">
            <p className="text-2xl font-semibold text-white/90 italic">
              „Vy zenujete, my bazénujeme."
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-b from-white to-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/logo-blue-gradient.svg"
              alt="Rentmil"
              width={240}
              height={90}
              priority
              className="mx-auto object-contain"
            />
          </div>

          {/* Form header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#48A9A6]/10 text-[#01384B] text-sm font-medium mb-4">
              <span className="w-2 h-2 bg-[#48A9A6] rounded-full animate-pulse" />
              Interní systém
            </div>
            <h1 className="text-3xl font-bold text-[#01384B] font-display">
              Nabídkovač
            </h1>
            <p className="text-muted-foreground mt-2">
              Přihlaste se pro přístup do systému
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mailová adresa
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11 h-12 bg-white border-gray-200 focus:border-[#48A9A6] focus:ring-[#48A9A6]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Heslo
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11 h-12 bg-white border-gray-200 focus:border-[#48A9A6] focus:ring-[#48A9A6]/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#01384B] to-[#025a6e] hover:from-[#025a6e] hover:to-[#01384B] text-white font-semibold shadow-lg shadow-[#01384B]/20 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Přihlašuji...
                </>
              ) : (
                'Přihlásit se'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Problémy s přihlášením? Kontaktujte administrátora.
            </p>
          </div>

          {/* Mobile mascot */}
          <div className="lg:hidden mt-8 flex justify-center">
            <Image
              src="/maskot-hq.png"
              alt="Bazénový mistr"
              width={150}
              height={150}
              className="object-contain opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
      <div className="text-center">
        <Image
          src="/logo.png"
          alt="Rentmil"
          width={200}
          height={115}
          priority
          className="mx-auto object-contain mb-8"
        />
        <Loader2 className="w-8 h-8 animate-spin text-[#48A9A6] mx-auto" />
        <p className="mt-4 text-muted-foreground">Načítám...</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  )
}
