'use client'

import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { SyncLog } from '@/lib/supabase/types'

interface SyncLogListProps {
  logs: SyncLog[]
}

export function SyncLogList({ logs }: SyncLogListProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Zatim zadne pokusy o synchronizaci
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3">
          {log.status === 'success' && (
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          )}
          {log.status === 'error' && (
            <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          )}
          {log.status === 'pending' && (
            <Clock className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {log.status === 'success' && 'Uspesne odeslano'}
              {log.status === 'error' && 'Chyba'}
              {log.status === 'pending' && 'Odesláno'}
            </p>
            {log.error_message && (
              <p className="text-xs text-red-600 mt-0.5 break-words">
                {log.error_message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(log.created_at), 'd.M.yyyy HH:mm:ss', { locale: cs })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
