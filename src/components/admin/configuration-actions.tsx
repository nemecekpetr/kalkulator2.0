'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Mail } from 'lucide-react'
import { retryPipedriveSync, resendConfigurationEmail } from '@/app/actions/admin-actions'
import { toast } from 'sonner'

interface ConfigurationActionsProps {
  configId: string
  action: 'retry' | 'resend-email'
}

export function ConfigurationActions({ configId, action }: ConfigurationActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleRetry = async () => {
    setIsLoading(true)
    try {
      const result = await retryPipedriveSync(configId)
      if (result.success) {
        toast.success('Konfigurace byla znovu odeslána do Pipedrive')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se odeslat do Pipedrive')
      }
    } catch {
      toast.error('Nepodařilo se odeslat do Pipedrive')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setIsLoading(true)
    try {
      const result = await resendConfigurationEmail(configId)
      if (result.success) {
        toast.success('Email byl úspěšně odeslán')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodařilo se odeslat email')
      }
    } catch {
      toast.error('Nepodařilo se odeslat email')
    } finally {
      setIsLoading(false)
    }
  }

  if (action === 'retry') {
    return (
      <Button variant="outline" size="sm" onClick={handleRetry} disabled={isLoading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Odesílám...' : 'Znovu odeslat do Pipedrive'}
      </Button>
    )
  }

  if (action === 'resend-email') {
    return (
      <Button variant="outline" size="sm" onClick={handleResendEmail} disabled={isLoading}>
        <Mail className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
        {isLoading ? 'Odesílám...' : 'Odeslat email znovu'}
      </Button>
    )
  }

  return null
}
