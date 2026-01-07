'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Package,
  FileText,
  User,
  Factory,
  Calendar,
  Settings,
} from 'lucide-react'
import type { AssistantToolCall } from '@/lib/supabase/types'

interface AssistantToolResultProps {
  tool: AssistantToolCall
}

export function AssistantToolResult({ tool }: AssistantToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!tool.result) return null

  const result = tool.result as Record<string, unknown>

  // Get icon based on tool type
  const getIcon = () => {
    switch (tool.name) {
      case 'get_quote':
      case 'list_recent_quotes':
      case 'update_quote_item':
      case 'add_quote_item':
      case 'remove_quote_item':
      case 'apply_discount':
      case 'update_quote_status':
      case 'compare_quotes':
        return <FileText className="h-4 w-4" />
      case 'search_products':
      case 'get_upsell_suggestions':
        return <Package className="h-4 w-4" />
      case 'get_customer_history':
        return <User className="h-4 w-4" />
      case 'get_production_status':
        return <Factory className="h-4 w-4" />
      case 'create_pipedrive_activity':
        return <Calendar className="h-4 w-4" />
      case 'set_user_preference':
        return <Settings className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Get summary based on tool type
  const getSummary = (): string => {
    switch (tool.name) {
      case 'get_quote':
        return `Nabídka ${result.quote_number || ''}`
      case 'get_order':
        return `Objednávka ${result.order_number || ''}`
      case 'list_recent_quotes': {
        const quotes = result.quotes as unknown[]
        return `${quotes?.length || 0} nabídek`
      }
      case 'search_products': {
        const products = result.products as unknown[]
        return `Nalezeno ${products?.length || 0} produktů`
      }
      case 'get_customer_history':
        return `Historie zákazníka`
      case 'update_quote_item':
      case 'add_quote_item':
        return 'Položka aktualizována'
      case 'remove_quote_item':
        return 'Položka odebrána'
      case 'apply_discount':
        return 'Sleva aplikována'
      case 'update_quote_status':
        return 'Stav změněn'
      case 'add_note':
        return 'Poznámka přidána'
      case 'compare_quotes':
        return 'Porovnání nabídek'
      case 'get_upsell_suggestions': {
        const suggestions = result.suggestions as unknown[]
        return `${suggestions?.length || 0} doporučení`
      }
      case 'create_pipedrive_activity':
        return result.success ? 'Aktivita vytvořena' : 'Chyba'
      case 'set_user_preference':
        return 'Preference uložena'
      default:
        return 'Výsledek'
    }
  }

  return (
    <div className="bg-muted/50 border rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-muted/80 transition-colors"
      >
        {getIcon()}
        <span className="flex-1 text-left font-medium">{getSummary()}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t">
          <ToolResultContent tool={tool} result={result} />
        </div>
      )}
    </div>
  )
}

interface ToolResultContentProps {
  tool: AssistantToolCall
  result: Record<string, unknown>
}

function ToolResultContent({ tool, result }: ToolResultContentProps) {
  // Render based on tool type
  switch (tool.name) {
    case 'get_quote':
      return <QuoteResult result={result} />
    case 'list_recent_quotes':
      return <QuotesListResult result={result} />
    case 'search_products':
      return <ProductsResult result={result} />
    case 'get_customer_history':
      return <CustomerHistoryResult result={result} />
    case 'compare_quotes':
      return <CompareQuotesResult result={result} />
    case 'get_upsell_suggestions':
      return <UpsellResult result={result} />
    case 'create_pipedrive_activity':
      return <ActivityResult result={result} />
    case 'get_order':
      return <OrderResult result={result} />
    case 'get_production_status':
      return <ProductionResult result={result} />
    default:
      // Pro ostatní tooly nezobrazuj JSON, jen stručné info
      if (result.success) {
        return <p className="text-sm text-green-600">Akce proběhla úspěšně</p>
      }
      if (result.error) {
        return <p className="text-sm text-red-600">{result.error as string}</p>
      }
      return <p className="text-sm text-muted-foreground">Hotovo</p>
  }
}

function QuoteResult({ result }: { result: Record<string, unknown> }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Zákazník:</span>
        <span>{result.customer_name as string}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Stav:</span>
        <span>{result.status as string}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span className="text-muted-foreground">Celkem:</span>
        <span>{formatPrice(result.total_price as number)}</span>
      </div>
    </div>
  )
}

function ProductsResult({ result }: { result: Record<string, unknown> }) {
  const products = (result.products as { name: string; unit_price: number; category: string }[]) || []

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Žádné produkty nenalezeny</p>
  }

  return (
    <div className="space-y-2">
      {products.slice(0, 5).map((product, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span className="truncate flex-1">{product.name}</span>
          <span className="text-muted-foreground ml-2">{formatPrice(product.unit_price)}</span>
        </div>
      ))}
      {products.length > 5 && (
        <p className="text-xs text-muted-foreground">
          ... a dalších {products.length - 5} produktů
        </p>
      )}
    </div>
  )
}

function CustomerHistoryResult({ result }: { result: Record<string, unknown> }) {
  const quotes = (result.quotes as unknown[]) || []
  const orders = (result.orders as unknown[]) || []
  const configurations = (result.configurations as unknown[]) || []

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Konfigurace:</span>
        <span>{configurations.length}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Nabídky:</span>
        <span>{quotes.length}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Objednávky:</span>
        <span>{orders.length}</span>
      </div>
    </div>
  )
}

// Seznam nabídek
function QuotesListResult({ result }: { result: Record<string, unknown> }) {
  const quotes =
    (result.quotes as {
      id: string
      quote_number: string
      customer_name: string
      status: string
      total_price: number
      created_at: string
    }[]) || []

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const statusLabels: Record<string, string> = {
    draft: 'Rozpracovaná',
    sent: 'Odeslaná',
    accepted: 'Přijatá',
    rejected: 'Odmítnutá',
  }

  if (quotes.length === 0) {
    return <p className="text-sm text-muted-foreground">Žádné nabídky</p>
  }

  return (
    <div className="space-y-2">
      {quotes.slice(0, 5).map((quote) => (
        <div
          key={quote.id}
          className="flex items-center justify-between text-sm py-1 border-b last:border-0"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{quote.customer_name}</div>
            <div className="text-xs text-muted-foreground">
              {quote.quote_number} · {statusLabels[quote.status] || quote.status}
            </div>
          </div>
          <div className="text-right ml-2">
            <div className="font-medium">{formatPrice(quote.total_price)}</div>
          </div>
        </div>
      ))}
      {quotes.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          ... a dalších {quotes.length - 5} nabídek
        </p>
      )}
    </div>
  )
}

// Porovnání nabídek
function CompareQuotesResult({ result }: { result: Record<string, unknown> }) {
  const comparison = result.comparison as {
    quotes: { quote_number: string; customer_name: string; total_price: number }[]
    price_difference: number
    common_items: number
    unique_items: Record<string, string[]>
  }

  if (!comparison) {
    return <p className="text-sm text-muted-foreground">Nelze porovnat</p>
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        {comparison.quotes.map((q, i) => (
          <div key={i} className="p-2 bg-muted rounded">
            <div className="font-medium">{q.quote_number}</div>
            <div className="text-xs text-muted-foreground">{q.customer_name}</div>
            <div className="font-medium mt-1">{formatPrice(q.total_price)}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Cenový rozdíl:</span>
        <span className="font-medium">{formatPrice(comparison.price_difference)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Společné položky:</span>
        <span>{comparison.common_items}</span>
      </div>
    </div>
  )
}

// Upsell návrhy
function UpsellResult({ result }: { result: Record<string, unknown> }) {
  const suggestions =
    (result.suggestions as {
      id: string
      message: string
      products: string[]
      priority: number
    }[]) || []

  if (suggestions.length === 0) {
    return <p className="text-sm text-muted-foreground">Žádná doporučení</p>
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <div key={i} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
          <p>{s.message}</p>
          {s.products.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Doporučené produkty: {s.products.join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// Pipedrive aktivita
function ActivityResult({ result }: { result: Record<string, unknown> }) {
  if (!result.success) {
    return <p className="text-sm text-red-600">{(result.error as string) || 'Chyba'}</p>
  }

  const activity = result.activity as {
    subject: string
    type: string
    due_date: string
    due_time?: string
  }

  const typeLabels: Record<string, string> = {
    call: 'Hovor',
    meeting: 'Schůzka',
    task: 'Úkol',
    deadline: 'Deadline',
    email: 'Email',
    lunch: 'Oběd',
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-green-600">
        <span>✓</span>
        <span>Aktivita vytvořena v Pipedrive</span>
      </div>
      {activity && (
        <div className="p-2 bg-muted rounded">
          <div className="font-medium">{activity.subject}</div>
          <div className="text-xs text-muted-foreground">
            {typeLabels[activity.type] || activity.type} · {activity.due_date}
            {activity.due_time && ` v ${activity.due_time}`}
          </div>
        </div>
      )}
    </div>
  )
}

// Objednávka
function OrderResult({ result }: { result: Record<string, unknown> }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const statusLabels: Record<string, string> = {
    created: 'Vytvořena',
    sent: 'Odeslána',
    in_production: 'Ve výrobě',
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Zákazník:</span>
        <span>{result.customer_name as string}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Stav:</span>
        <span>{statusLabels[(result.status as string)] || (result.status as string)}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span className="text-muted-foreground">Celkem:</span>
        <span>{formatPrice(result.total_price as number)}</span>
      </div>
    </div>
  )
}

// Stav výroby
function ProductionResult({ result }: { result: Record<string, unknown> }) {
  const statusLabels: Record<string, string> = {
    pending: 'Čeká',
    in_progress: 'Probíhá',
    completed: 'Dokončeno',
    cancelled: 'Zrušeno',
  }

  const items = (result.checklist_items as { name: string; completed: boolean }[]) || []
  const completedCount = items.filter((i) => i.completed).length

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Stav:</span>
        <span>{statusLabels[(result.status as string)] || (result.status as string)}</span>
      </div>
      {items.length > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Checklist:</span>
          <span>
            {completedCount}/{items.length} hotovo
          </span>
        </div>
      )}
      {typeof result.notes === 'string' && result.notes && (
        <div className="p-2 bg-muted rounded text-xs">
          {result.notes}
        </div>
      )}
    </div>
  )
}
