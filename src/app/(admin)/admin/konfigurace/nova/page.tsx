import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ConfigurationForm } from '@/components/admin/configuration-form'

export default function NewConfigurationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/konfigurace">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nová konfigurace</h1>
          <p className="text-muted-foreground">
            Vytvořte novou konfiguraci bazénu
          </p>
        </div>
      </div>

      {/* Form */}
      <ConfigurationForm mode="create" />
    </div>
  )
}
