'use client'

import Image from 'next/image'

export function AssistantTyping() {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-[#FF8621] flex items-center justify-center overflow-hidden">
        <Image
          src="/maskot-profile.png"
          alt=""
          width={28}
          height={28}
          className="object-cover translate-y-0.5"
        />
      </div>

      {/* Typing indicator */}
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
