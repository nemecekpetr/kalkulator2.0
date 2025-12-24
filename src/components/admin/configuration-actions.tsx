'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { retryPipedriveSync } from '@/app/actions/admin-actions'
import { toast } from 'sonner'

interface ConfigurationActionsProps {
  configId: string
  action: 'retry'
}

export function ConfigurationActions({ configId, action }: ConfigurationActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleRetry = async () => {
    setIsLoading(true)
    try {
      const result = await retryPipedriveSync(configId)
      if (result.success) {
        toast.success('Konfigurace byla znovu odeslana do Pipedrive')
        router.refresh()
      } else {
        toast.error(result.error || 'Nepodarilo se odeslat do Pipedrive')
      }
    } catch {
      toast.error('Nepodarilo se odeslat do Pipedrive')
    } finally {
      setIsLoading(false)
    }
  }

  if (action === 'retry') {
    return (
      <Button variant="outline" onClick={handleRetry} disabled={isLoading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Odesilam...' : 'Znovu odeslat'}
      </Button>
    )
  }

  return null
}
