import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Pencil,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
} from 'lucide-react'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getAccessoryLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'
import { ConfigurationActions } from '@/components/admin/configuration-actions'
import { SyncLogList } from '@/components/admin/sync-log-list'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getConfiguration(id: string) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('configurations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as {
    id: string
    created_at: string
    contact_name: string
    contact_email: string
    contact_phone: string | null
    pool_shape: string
    pool_type: string
    dimensions: { diameter?: number; width?: number; length?: number; depth?: number }
    color: string
    stairs: string
    technology: string[]
    accessories: string[]
    heating: string
    roofing: string
    message: string | null
    pipedrive_status: string
    pipedrive_deal_id: string | null
  }
}

async function getSyncLogs(configurationId: string) {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('sync_log')
    .select('*')
    .eq('configuration_id', configurationId)
    .order('created_at', { ascending: false })

  return data || []
}

export default async function ConfigurationDetailPage({ params }: PageProps) {
  const { id } = await params
  const [config, syncLogs] = await Promise.all([
    getConfiguration(id),
    getSyncLogs(id),
  ])

  if (!config) {
    notFound()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Odesláno do Pipedrive
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Chyba při odesílání
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Čeká na odeslání
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/konfigurace">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detail konfigurace</h1>
            <p className="text-muted-foreground">
              {format(new Date(config.created_at), 'd. MMMM yyyy, HH:mm', { locale: cs })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.pipedrive_status !== 'success' && (
            <ConfigurationActions configId={config.id} action="retry" />
          )}
          <Button asChild>
            <Link href={`/admin/nabidky/nova?configurationId=${config.id}`}>
              <FileText className="w-4 h-4 mr-2" />
              Vytvořit nabídku
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/konfigurace/${config.id}/upravit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Upravit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle>Kontaktní údaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{config.contact_name}</p>
                  <p className="text-sm text-muted-foreground">Jméno</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <a href={`mailto:${config.contact_email}`} className="font-medium hover:underline">
                    {config.contact_email}
                  </a>
                  <p className="text-sm text-muted-foreground">Email</p>
                </div>
              </div>
              {config.contact_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <a href={`tel:${config.contact_phone}`} className="font-medium hover:underline">
                      {config.contact_phone}
                    </a>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                  </div>
                </div>
              )}
              {config.message && (
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium whitespace-pre-wrap">{config.message}</p>
                    <p className="text-sm text-muted-foreground">Zpráva</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pool configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Konfigurace bazénu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tvar</p>
                  <p className="font-medium">{getShapeLabel(config.pool_shape)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Typ konstrukce</p>
                  <p className="font-medium">{getTypeLabel(config.pool_type)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Rozměry</p>
                  <p className="font-medium">{formatDimensions(config.pool_shape, config.dimensions)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Barva</p>
                  <p className="font-medium">{getColorLabel(config.color)}</p>
                </div>
                {config.pool_shape !== 'circle' && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Schodiště</p>
                    <p className="font-medium">{getStairsLabel(config.stairs)}</p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Technologie</p>
                  <div className="flex flex-wrap gap-2">
                    {config.technology && config.technology.length > 0 ? (
                      config.technology.map((tech: string) => (
                        <Badge key={tech} variant="secondary">
                          {getTechnologyLabel(tech)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Příslušenství</p>
                  <div className="flex flex-wrap gap-2">
                    {config.accessories && config.accessories.length > 0 ? (
                      config.accessories.map((acc: string) => (
                        <Badge key={acc} variant="secondary">
                          {getAccessoryLabel(acc)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Ohřev</p>
                    <p className="font-medium">{getHeatingLabel(config.heating)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Zastřešení</p>
                    <p className="font-medium">{getRoofingLabel(config.roofing)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pipedrive status */}
          <Card>
            <CardHeader>
              <CardTitle>Stav Pipedrive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getStatusBadge(config.pipedrive_status)}
              {config.pipedrive_deal_id && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Deal ID</p>
                  <p className="font-medium">{config.pipedrive_deal_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync logs */}
          <Card>
            <CardHeader>
              <CardTitle>Historie synchronizace</CardTitle>
              <CardDescription>Pokusy o odeslání do Pipedrive</CardDescription>
            </CardHeader>
            <CardContent>
              <SyncLogList logs={syncLogs} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
