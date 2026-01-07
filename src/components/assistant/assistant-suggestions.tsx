'use client'

import { usePathname } from 'next/navigation'
import { getSuggestionsForPath, type Suggestion } from '@/lib/assistant/context-suggestions'
import { useAssistantStore } from '@/stores/assistant-store'
import { cn } from '@/lib/utils'

interface AssistantSuggestionsProps {
  className?: string
}

export function AssistantSuggestions({ className }: AssistantSuggestionsProps) {
  const pathname = usePathname()
  const sendMessage = useAssistantStore((state) => state.sendMessage)
  const isTyping = useAssistantStore((state) => state.isTyping)

  const suggestions = getSuggestionsForPath(pathname)

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (isTyping) return
    sendMessage(suggestion.text)
  }

  if (suggestions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          disabled={isTyping}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
            'transition-colors cursor-pointer border border-transparent hover:border-border',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <suggestion.icon className="w-3.5 h-3.5" />
          <span>{suggestion.text}</span>
        </button>
      ))}
    </div>
  )
}
