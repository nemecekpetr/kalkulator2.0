'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useAssistantStore,
  useAssistantPendingConfirmation,
} from '@/stores/assistant-store'
import {
  Calendar,
  Phone,
  Users,
  FileText,
  Percent,
  Package,
  MessageSquare,
  Settings,
  Trash2,
} from 'lucide-react'

export function AssistantConfirmation() {
  const pendingConfirmation = useAssistantPendingConfirmation()
  const confirmAction = useAssistantStore((state) => state.confirmAction)
  const cancelAction = useAssistantStore((state) => state.cancelAction)

  if (!pendingConfirmation) return null

  const { toolName, toolInput } = pendingConfirmation

  return (
    <AlertDialog open={!!pendingConfirmation}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getToolIcon(toolName)}
            Potvrdit akci
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <ToolConfirmationContent toolName={toolName} toolInput={toolInput} />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelAction}>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmAction}
            className="bg-gradient-to-br from-[#FF8621] to-[#ED6663] hover:from-[#FF9A45] hover:to-[#F07B79] hover:scale-105 hover:shadow-lg active:scale-100 transition-all duration-200 cursor-pointer"
          >
            Provést
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function getToolIcon(toolName: string) {
  const iconClass = 'h-5 w-5'
  switch (toolName) {
    case 'create_pipedrive_activity':
      return <Calendar className={iconClass} />
    case 'update_quote_item':
    case 'add_quote_item':
      return <Package className={iconClass} />
    case 'remove_quote_item':
      return <Trash2 className={iconClass} />
    case 'apply_discount':
      return <Percent className={iconClass} />
    case 'update_quote_status':
      return <FileText className={iconClass} />
    case 'add_note':
      return <MessageSquare className={iconClass} />
    case 'set_user_preference':
      return <Settings className={iconClass} />
    default:
      return <FileText className={iconClass} />
  }
}

interface ToolConfirmationContentProps {
  toolName: string
  toolInput: Record<string, unknown>
}

function ToolConfirmationContent({ toolName, toolInput }: ToolConfirmationContentProps) {
  switch (toolName) {
    case 'create_pipedrive_activity':
      return <PipedriveActivityConfirmation input={toolInput} />
    case 'update_quote_item':
      return <UpdateQuoteItemConfirmation input={toolInput} />
    case 'add_quote_item':
      return <AddQuoteItemConfirmation input={toolInput} />
    case 'remove_quote_item':
      return <RemoveQuoteItemConfirmation input={toolInput} />
    case 'apply_discount':
      return <ApplyDiscountConfirmation input={toolInput} />
    case 'update_quote_status':
      return <UpdateQuoteStatusConfirmation input={toolInput} />
    case 'add_note':
      return <AddNoteConfirmation input={toolInput} />
    case 'set_user_preference':
      return <SetPreferenceConfirmation input={toolInput} />
    default:
      return <GenericConfirmation toolName={toolName} input={toolInput} />
  }
}

// Pipedrive aktivita
function PipedriveActivityConfirmation({ input }: { input: Record<string, unknown> }) {
  const typeLabels: Record<string, string> = {
    call: 'Hovor',
    meeting: 'Schůzka',
    task: 'Úkol',
    deadline: 'Deadline',
    email: 'Email',
    lunch: 'Oběd',
  }

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('cs-CZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return date
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Vytvořím novou aktivitu v Pipedrive:
      </p>
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Phone className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{input.subject as string}</p>
            <p className="text-sm text-muted-foreground">
              {typeLabels[input.type as string] || (input.type as string)}
            </p>
          </div>
        </div>
        <div className="border-t pt-2 mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datum:</span>
            <span className="text-foreground">{formatDate(input.due_date as string)}</span>
          </div>
          {typeof input.due_time === 'string' && input.due_time && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Čas:</span>
              <span className="text-foreground">{input.due_time}</span>
            </div>
          )}
          {typeof input.note === 'string' && input.note && (
            <div className="pt-2">
              <span className="text-muted-foreground">Poznámka:</span>
              <p className="text-foreground mt-1">{input.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Přidat položku
function AddQuoteItemConfirmation({ input }: { input: Record<string, unknown> }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Přidám novou položku do nabídky:
      </p>
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <p className="font-semibold text-foreground">{input.name as string}</p>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kategorie:</span>
            <span className="text-foreground">{input.category as string}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Množství:</span>
            <span className="text-foreground">{input.quantity as number} ks</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cena za kus:</span>
            <span className="text-foreground">{formatPrice(input.unit_price as number)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
            <span>Celkem:</span>
            <span>{formatPrice((input.quantity as number) * (input.unit_price as number))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Upravit položku
function UpdateQuoteItemConfirmation({ input }: { input: Record<string, unknown> }) {
  const updates = input.updates as Record<string, unknown>
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Upravím položku v nabídce:
      </p>
      <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
        {typeof updates.name === 'string' && updates.name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nový název:</span>
            <span className="text-foreground">{updates.name}</span>
          </div>
        )}
        {typeof updates.quantity === 'number' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nové množství:</span>
            <span className="text-foreground">{updates.quantity} ks</span>
          </div>
        )}
        {typeof updates.unit_price === 'number' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nová cena:</span>
            <span className="text-foreground">{formatPrice(updates.unit_price)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Odebrat položku
function RemoveQuoteItemConfirmation({ input }: { input: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Odeberu položku z nabídky.
      </p>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        Tato akce je nevratná. Položka bude trvale odebrána z nabídky.
      </div>
    </div>
  )
}

// Aplikovat slevu
function ApplyDiscountConfirmation({ input }: { input: Record<string, unknown> }) {
  const variantLabels: Record<string, string> = {
    ekonomicka: 'Ekonomická',
    optimalni: 'Optimální',
    premiova: 'Prémiová',
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Aplikuji slevu na nabídku:
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-green-800">Varianta:</span>
          <span className="font-semibold text-green-900">
            {variantLabels[input.variant_key as string] || (input.variant_key as string)}
          </span>
        </div>
        {typeof input.discount_percent === 'number' && (
          <div className="flex justify-between">
            <span className="text-green-800">Sleva:</span>
            <span className="font-semibold text-green-900">{input.discount_percent}%</span>
          </div>
        )}
        {typeof input.discount_amount === 'number' && (
          <div className="flex justify-between">
            <span className="text-green-800">Sleva:</span>
            <span className="font-semibold text-green-900">
              {formatPrice(input.discount_amount)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Změnit stav nabídky
function UpdateQuoteStatusConfirmation({ input }: { input: Record<string, unknown> }) {
  const statusLabels: Record<string, string> = {
    draft: 'Rozpracovaná',
    sent: 'Odeslaná',
    accepted: 'Přijatá',
    rejected: 'Odmítnutá',
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  const status = input.status as string

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Změním stav nabídky na:
      </p>
      <div className="flex justify-center">
        <span className={`px-4 py-2 rounded-full font-semibold ${statusColors[status] || 'bg-muted'}`}>
          {statusLabels[status] || status}
        </span>
      </div>
    </div>
  )
}

// Přidat poznámku
function AddNoteConfirmation({ input }: { input: Record<string, unknown> }) {
  const entityLabels: Record<string, string> = {
    quote: 'nabídce',
    order: 'objednávce',
    configuration: 'konfiguraci',
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Přidám poznámku k {entityLabels[input.entity_type as string] || 'záznamu'}:
      </p>
      <div className="bg-muted rounded-lg p-4">
        <p className="text-sm text-foreground italic">"{input.note as string}"</p>
        {input.is_internal === true && (
          <p className="text-xs text-muted-foreground mt-2">
            (Interní poznámka - neviditelná pro zákazníka)
          </p>
        )}
      </div>
    </div>
  )
}

// Uložit preferenci
function SetPreferenceConfirmation({ input }: { input: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Uložím si tvou preferenci:
      </p>
      <div className="bg-muted rounded-lg p-4">
        <p className="text-sm text-foreground">{input.description as string}</p>
      </div>
    </div>
  )
}

// Fallback pro neznámé tooly
function GenericConfirmation({
  toolName,
  input,
}: {
  toolName: string
  input: Record<string, unknown>
}) {
  const toolLabels: Record<string, string> = {
    update_quote_item: 'Upravit položku v nabídce',
    add_quote_item: 'Přidat položku do nabídky',
    remove_quote_item: 'Odebrat položku z nabídky',
    apply_discount: 'Aplikovat slevu',
    update_quote_status: 'Změnit stav nabídky',
    add_note: 'Přidat poznámku',
    create_pipedrive_activity: 'Vytvořit aktivitu v Pipedrive',
    set_user_preference: 'Uložit preferenci',
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Chystám se provést: <strong>{toolLabels[toolName] || toolName}</strong>
      </p>
      <div className="bg-muted rounded-lg p-3 text-xs">
        <pre className="overflow-auto max-h-32 text-muted-foreground">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>
    </div>
  )
}
