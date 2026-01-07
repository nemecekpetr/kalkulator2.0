'use client'

import Image from 'next/image'
import { useAssistantStore, useAssistantIsOpen } from '@/stores/assistant-store'
import { AssistantPanel } from './assistant-panel'
import { cn } from '@/lib/utils'

export function AssistantFab() {
  const isOpen = useAssistantIsOpen()
  const togglePanel = useAssistantStore((state) => state.togglePanel)

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={togglePanel}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-32 h-32 rounded-full',
          'bg-[#01384B]',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-300',
          'flex items-center justify-center',
          'group',
          // Scale down when panel is open
          isOpen && 'scale-90 opacity-50'
        )}
        aria-label="Otevřít AI asistenta Rentmilák"
      >
        {/* Mascot Image */}
        <div className="relative w-24 h-24 transition-transform group-hover:scale-110">
          <Image
            src="/maskot-thinking.png"
            alt="Rentmil Asistent"
            fill
            className="object-contain drop-shadow-md"
            sizes="96px"
            priority
          />
        </div>

        {/* Pulse animation ring */}
        <span className="absolute inset-0 rounded-full bg-[#48A9A6] animate-ping opacity-20" />
      </button>

      {/* Chat Panel */}
      <AssistantPanel />
    </>
  )
}
