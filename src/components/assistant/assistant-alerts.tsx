'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Clock,
  Factory,
  Bell,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AssistantAlert, AssistantAlertType } from '@/lib/supabase/types'

interface AssistantAlertsProps {
  className?: string
  onClose?: () => void
}

export function AssistantAlerts({ className, onClose }: AssistantAlertsProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<AssistantAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/assistant/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (alertIds: string[]) => {
    try {
      await fetch('/api/assistant/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_ids: alertIds, action: 'read' }),
      })
      setAlerts(
        alerts.map((a) =>
          alertIds.includes(a.id) ? { ...a, is_read: true } : a
        )
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch('/api/assistant/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_ids: [alertId], action: 'dismiss' }),
      })
      setAlerts(alerts.filter((a) => a.id !== alertId))
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  const dismissAll = async () => {
    try {
      await fetch('/api/assistant/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_all' }),
      })
      setAlerts([])
    } catch (error) {
      console.error('Failed to dismiss all:', error)
    }
  }

  const handleAlertClick = (alert: AssistantAlert) => {
    if (!alert.is_read) {
      markAsRead([alert.id])
    }
    if (alert.action_url) {
      router.push(alert.action_url)
      onClose?.()
    }
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length

  if (isLoading) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        Načítám upozornění...
      </div>
    )
  }

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className={cn('border-b', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">
            Upozornění ({unreadCount} nepřečtených)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Alert list */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-1 max-h-64 overflow-y-auto">
          {alerts.slice(0, 5).map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onClick={() => handleAlertClick(alert)}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))}

          {alerts.length > 5 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              +{alerts.length - 5} dalších upozornění
            </p>
          )}

          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissAll}
              className="w-full text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Zahodit vše
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface AlertItemProps {
  alert: AssistantAlert
  onClick: () => void
  onDismiss: () => void
}

function AlertItem({ alert, onClick, onDismiss }: AlertItemProps) {
  const icon = getAlertIcon(alert.alert_type)
  const priorityColor = getPriorityColor(alert.priority)

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors group',
        alert.is_read ? 'bg-muted/30' : 'bg-muted',
        'hover:bg-muted/80'
      )}
      onClick={onClick}
    >
      <div className={cn('mt-0.5', priorityColor)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs font-medium truncate',
            !alert.is_read && 'font-semibold'
          )}
        >
          {alert.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {alert.message}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

function getAlertIcon(type: AssistantAlertType) {
  switch (type) {
    case 'expiring_quote':
      return <Clock className="h-4 w-4" />
    case 'inactive_quote':
      return <Clock className="h-4 w-4" />
    case 'production_delay':
      return <Factory className="h-4 w-4" />
    case 'missing_data':
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'text-red-500'
    case 'high':
      return 'text-orange-500'
    case 'normal':
      return 'text-yellow-500'
    default:
      return 'text-muted-foreground'
  }
}

// Hook for fetching alert count (for badge in header)
export function useAlertCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/assistant/alerts')
        if (response.ok) {
          const data = await response.json()
          setCount(data.unread_count || 0)
        }
      } catch {
        // Ignore errors
      }
    }

    fetchCount()
    // Refresh every 5 minutes
    const interval = setInterval(fetchCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return count
}
