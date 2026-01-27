'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, RefreshCw, AlertCircle, CheckCircle, Settings2, Plus, Upload, TrendingUp, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { cs } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

interface ProductsHeaderProps {
  totalProducts: number
  lastSync: string | null
  pipedriveConfigured: boolean
}

export function ProductsHeader({ totalProducts, lastSync, pipedriveConfigured }: ProductsHeaderProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
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
          .single() as { data: { role: string } | null }
        if (profile) {
          setUserRole(profile.role as UserRole)
        }
      }
    }
    fetchUserRole()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/admin/products/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setSyncResult({
          success: true,
          message: `Synchronizováno: ${data.stats.created} nových, ${data.stats.updated} aktualizovaných`
        })
        // Refresh data
        setTimeout(() => router.refresh(), 1500)
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Chyba při synchronizaci'
        })
      }
    } catch {
      setSyncResult({
        success: false,
        message: 'Chyba připojení'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6" />
            Produkty
          </h1>
          <p className="text-muted-foreground">
            Celkem {totalProducts} produktů
            {lastSync && (
              <span className="ml-2">
                · Poslední sync {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: cs })}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/produkty/novy">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nový produkt
            </Button>
          </Link>

          {userRole === 'admin' && (
            <>
              <Link href="/admin/nastaveni/produkty/precenovani">
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Přeceňování
                </Button>
              </Link>
              <Link href="/admin/nastaveni/produkty/skupiny">
                <Button variant="outline" size="sm">
                  <Layers className="w-4 h-4 mr-2" />
                  Skupiny
                </Button>
              </Link>
              <Link href="/admin/nastaveni/produkty/mapovani">
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Mapování
                </Button>
              </Link>
              {pipedriveConfigured ? (
                <>
                  <Button
                    onClick={handleSync}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sync...' : 'Import'}
                  </Button>
                  <Link href="/admin/nastaveni/produkty/export">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  Pipedrive nenakonfigurováno
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {syncResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          syncResult.success
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {syncResult.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {syncResult.message}
        </div>
      )}
    </div>
  )
}
