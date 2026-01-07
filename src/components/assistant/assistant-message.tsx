'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/stores/assistant-store'
import { AssistantToolResult } from './assistant-tool-result'
import { Check, X, Loader2 } from 'lucide-react'

interface AssistantMessageProps {
  message: ChatMessage
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-white border-2 border-[#FF8621]'
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium">Vy</span>
        ) : (
          <Image
            src="/maskot-profile.png"
            alt=""
            width={28}
            height={28}
            className="object-cover translate-y-0.5"
          />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 space-y-2', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block max-w-[85%] rounded-2xl px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((tool, index) => (
              <ToolCallBadge key={index} tool={tool} />
            ))}
          </div>
        )}

        {/* Tool results */}
        {message.toolCalls && message.toolCalls.some(t => t.result) && (
          <div className="space-y-2">
            {message.toolCalls
              .filter(t => t.result)
              .map((tool, index) => (
                <AssistantToolResult key={index} tool={tool} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ToolCallBadgeProps {
  tool: {
    name: string
    status: 'pending' | 'confirmed' | 'executed' | 'cancelled' | 'error'
    error?: string
  }
}

function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const statusIcon = {
    pending: <Loader2 className="h-3 w-3 animate-spin" />,
    confirmed: <Loader2 className="h-3 w-3 animate-spin" />,
    executed: <Check className="h-3 w-3" />,
    cancelled: <X className="h-3 w-3" />,
    error: <X className="h-3 w-3" />,
  }

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    executed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
    error: 'bg-red-100 text-red-800',
  }

  const toolLabels: Record<string, string> = {
    get_quote: 'Načítám nabídku',
    get_order: 'Načítám objednávku',
    get_configuration: 'Načítám konfiguraci',
    search_products: 'Hledám produkty',
    get_customer_history: 'Načítám historii zákazníka',
    get_production_status: 'Načítám stav výroby',
    list_recent_quotes: 'Načítám nabídky',
    get_upsell_suggestions: 'Analyzuji upselling',
    compare_quotes: 'Porovnávám nabídky',
    create_pipedrive_activity: 'Vytvářím aktivitu',
    set_user_preference: 'Ukládám preferenci',
    update_quote_item: 'Upravuji položku',
    add_quote_item: 'Přidávám položku',
    remove_quote_item: 'Odebírám položku',
    apply_discount: 'Aplikuji slevu',
    update_quote_status: 'Měním stav nabídky',
    add_note: 'Přidávám poznámku',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        statusColor[tool.status]
      )}
    >
      {statusIcon[tool.status]}
      <span>{toolLabels[tool.name] || tool.name}</span>
      {tool.error && <span className="text-red-600">({tool.error})</span>}
    </div>
  )
}
