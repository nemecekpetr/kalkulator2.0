'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Trash2, History, Plus } from 'lucide-react'
import {
  useAssistantStore,
  useAssistantIsOpen,
  useAssistantMessages,
  useAssistantIsTyping,
  useAssistantError,
  useAssistantShowHistory,
} from '@/stores/assistant-store'
import { AssistantMessage } from './assistant-message'
import { AssistantInput } from './assistant-input'
import { AssistantTyping } from './assistant-typing'
import { AssistantConfirmation } from './assistant-confirmation'
import { AssistantHistory } from './assistant-history'
import { AssistantSuggestions } from './assistant-suggestions'
import { AssistantAlerts } from './assistant-alerts'

export function AssistantPanel() {
  const isOpen = useAssistantIsOpen()
  const messages = useAssistantMessages()
  const isTyping = useAssistantIsTyping()
  const error = useAssistantError()
  const showHistory = useAssistantShowHistory()
  const closePanel = useAssistantStore((state) => state.closePanel)
  const clearConversation = useAssistantStore((state) => state.clearConversation)
  const toggleHistory = useAssistantStore((state) => state.toggleHistory)
  const startNewConversation = useAssistantStore((state) => state.startNewConversation)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && closePanel()}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[480px] sm:max-w-[480px] flex flex-col p-0 h-full"
        >
          {/* Header */}
          <SheetHeader className="border-b px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Logo - bílé pozadí, oranžový lem */}
              <div className="relative w-10 h-10 rounded-full bg-white border-2 border-[#FF8621] flex items-center justify-center overflow-hidden">
                <Image
                  src="/maskot-profile.png"
                  alt="AI asistent Rentmilák"
                  width={36}
                  height={36}
                  className="object-cover translate-y-1"
                />
              </div>
              {/* Název a popis */}
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg">AI asistent Rentmilák</SheetTitle>
                <SheetDescription className="text-xs">
                  Tvůj bazénový pomocník
                </SheetDescription>
              </div>
              {/* Tlačítka - mr-6 nechává místo pro X button */}
              <div className="flex items-center gap-1 flex-shrink-0 mr-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewConversation}
                  className="h-8 w-8"
                  title="Nová konverzace"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleHistory}
                  className="h-8 w-8"
                  title="Historie konverzací"
                >
                  <History className="h-4 w-4" />
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearConversation}
                    className="h-8 w-8"
                    title="Vymazat konverzaci"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Content - either history or chat */}
          {showHistory ? (
            <AssistantHistory />
          ) : (
            <>
              {/* Alerts section */}
              <AssistantAlerts onClose={closePanel} />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 min-h-0">
                <div className="py-4 space-y-4">
                  {messages.length === 0 ? (
                    <WelcomeMessage />
                  ) : (
                    messages.map((message) => (
                      <AssistantMessage key={message.id} message={message} />
                    ))
                  )}
                  {isTyping && <AssistantTyping />}
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  {/* Scroll anchor */}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input */}
              <SheetFooter className="border-t p-4 flex-shrink-0">
                <AssistantInput />
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AssistantConfirmation />
    </>
  )
}

function WelcomeMessage() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="relative w-24 h-24 mx-auto">
        <Image
          src="/maskot-profile.png"
          alt="AI asistent Rentmilák"
          fill
          className="object-contain"
        />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Ahoj, jsem Rentmilák!</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Tvůj AI bazénový asistent. Pomůžu ti s orientací v nabídkovači, nabídkami, objednávkami a vším okolo bazénů.
        </p>
      </div>

      {/* Kontextové návrhy */}
      <div className="pt-2">
        <p className="text-xs text-muted-foreground mb-3">Zkus se mě zeptat:</p>
        <AssistantSuggestions />
      </div>
    </div>
  )
}
