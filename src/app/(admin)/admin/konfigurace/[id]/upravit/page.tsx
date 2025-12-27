import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ConfigurationForm } from '@/components/admin/configuration-form'

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

  if (error) {
    return null
  }

  return data
}

export default async function EditConfigurationPage({ params }: PageProps) {
  const { id } = await params
  const config = await getConfiguration(id)

  if (!config) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/konfigurace/${id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upravit konfiguraci</h1>
          <p className="text-muted-foreground">
            Upravte údaje konfigurace
          </p>
        </div>
      </div>

      {/* Form */}
      <ConfigurationForm configuration={config} mode="edit" />
    </div>
  )
}
