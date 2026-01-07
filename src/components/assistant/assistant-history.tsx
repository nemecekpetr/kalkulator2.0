'use client'

import { History, Plus, Trash2, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useAssistantStore,
  useAssistantConversations,
  useAssistantIsLoadingConversations,
} from '@/stores/assistant-store'
import { cn } from '@/lib/utils'

export function AssistantHistory() {
  const conversations = useAssistantConversations()
  const isLoading = useAssistantIsLoadingConversations()
  const loadConversation = useAssistantStore((state) => state.loadConversation)
  const deleteConversation = useAssistantStore((state) => state.deleteConversation)
  const startNewConversation = useAssistantStore((state) => state.startNewConversation)
  const toggleHistory = useAssistantStore((state) => state.toggleHistory)
  const currentConversationId = useAssistantStore((state) => state.conversationId)

  const handleSelectConversation = (id: string) => {
    loadConversation(id)
  }

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteConversation(id)
  }

  const handleNewConversation = () => {
    startNewConversation()
  }

  // Format date to relative time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'právě teď'
    if (diffMins < 60) return `před ${diffMins} min`
    if (diffHours < 24) return `před ${diffHours} h`
    if (diffDays < 7) return `před ${diffDays} dny`
    return date.toLocaleDateString('cs-CZ')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="font-medium">Historie chatů</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleHistory}
        >
          Zpět
        </Button>
      </div>

      {/* New conversation button */}
      <div className="px-4 py-3 border-b">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleNewConversation}
        >
          <Plus className="h-4 w-4" />
          Nová konverzace
        </Button>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Zatím nemáte žádné konverzace
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Začněte nový chat s asistentem
            </p>
          </div>
        ) : (
          <div className="py-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors group',
                  currentConversationId === conversation.id && 'bg-muted'
                )}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conversation.title || 'Bez názvu'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(conversation.updated_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteConversation(e, conversation.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
