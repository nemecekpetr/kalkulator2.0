'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { useAssistantStore, useAssistantIsTyping } from '@/stores/assistant-store'

export function AssistantInput() {
  const [value, setValue] = useState('')
  const isTyping = useAssistantIsTyping()
  const sendMessage = useAssistantStore((state) => state.sendMessage)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [value])

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed || isTyping) return

    setValue('')
    await sendMessage(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2 w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Napište zprávu..."
        className="min-h-[40px] max-h-[120px] resize-none"
        rows={1}
        disabled={isTyping}
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!value.trim() || isTyping}
        className="flex-shrink-0 bg-gradient-to-br from-[#FF8621] to-[#ED6663] hover:opacity-90"
      >
        {isTyping ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
