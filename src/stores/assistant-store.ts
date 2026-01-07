import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AssistantMessage,
  AssistantToolCall,
  AssistantPageContext,
} from '@/lib/supabase/types'

// Client-side message type (slightly different from DB type)
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: AssistantToolCall[]
  createdAt: Date
  isStreaming?: boolean
}

// Pending confirmation for write actions
export interface PendingConfirmation {
  messageId: string
  toolName: string
  toolInput: Record<string, unknown>
  description: string // Human-readable description in Czech
}

// Conversation list item
export interface ConversationListItem {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface AssistantState {
  // UI state
  isOpen: boolean
  isTyping: boolean
  showHistory: boolean // Show conversation history list

  // Conversation
  conversationId: string | null
  messages: ChatMessage[]
  conversations: ConversationListItem[] // List of past conversations
  isLoadingConversations: boolean

  // Page context - what page/entity user is on
  currentContext: AssistantPageContext

  // Confirmation flow for write actions
  pendingConfirmation: PendingConfirmation | null

  // Error state
  error: string | null
}

export interface AssistantActions {
  // Panel control
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void

  // Message handling
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  appendToMessage: (id: string, content: string) => void

  // Context
  setContext: (context: AssistantPageContext) => void

  // Confirmation flow
  setPendingConfirmation: (confirmation: PendingConfirmation | null) => void
  confirmAction: () => Promise<void>
  cancelAction: () => void

  // Conversation management
  setConversationId: (id: string | null) => void
  clearConversation: () => void
  loadConversation: (id: string) => Promise<void>
  loadConversationsList: () => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  startNewConversation: () => void
  toggleHistory: () => void

  // Typing indicator
  setTyping: (isTyping: boolean) => void

  // Error handling
  setError: (error: string | null) => void

  // Reset
  reset: () => void
}

const initialState: AssistantState = {
  isOpen: false,
  isTyping: false,
  showHistory: false,
  conversationId: null,
  messages: [],
  conversations: [],
  isLoadingConversations: false,
  currentContext: {
    pathname: '/admin/dashboard',
  },
  pendingConfirmation: null,
  error: null,
}

export const useAssistantStore = create<AssistantState & AssistantActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Panel control
      togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
      openPanel: () => set({ isOpen: true }),
      closePanel: () => set({ isOpen: false }),

      // Message handling
      sendMessage: async (content: string) => {
        const { conversationId, currentContext, messages } = get()

        // Create user message
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          createdAt: new Date(),
        }

        // Add user message and start typing indicator
        set((state) => ({
          messages: [...state.messages, userMessage],
          isTyping: true,
          error: null,
        }))

        try {
          const response = await fetch('/api/assistant/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              conversationId,
              pageContext: currentContext,
              history: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content,
              })),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Chyba při komunikaci s asistentem')
          }

          // Handle streaming response
          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('Nelze číst odpověď')
          }

          // Create assistant message placeholder
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            createdAt: new Date(),
            isStreaming: true,
          }

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isTyping: false,
          }))

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // Process SSE events
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  // Stream complete
                  set((state) => ({
                    messages: state.messages.map(m =>
                      m.id === assistantMessage.id
                        ? { ...m, isStreaming: false }
                        : m
                    ),
                  }))
                  continue
                }

                try {
                  const event = JSON.parse(data)

                  if (event.type === 'delta') {
                    // Append text chunk
                    get().appendToMessage(assistantMessage.id, event.content)
                  } else if (event.type === 'conversation_id') {
                    // Save conversation ID
                    set({ conversationId: event.id })
                  } else if (event.type === 'tool_use') {
                    // Tool call - may need confirmation
                    if (event.requires_confirmation) {
                      set({
                        pendingConfirmation: {
                          messageId: assistantMessage.id,
                          toolName: event.name,
                          toolInput: event.input,
                          description: event.description,
                        },
                      })
                    }
                  } else if (event.type === 'tool_result') {
                    // Tool was executed, update message with result
                    set((state) => ({
                      messages: state.messages.map(m =>
                        m.id === assistantMessage.id
                          ? {
                              ...m,
                              toolCalls: [
                                ...(m.toolCalls || []),
                                {
                                  name: event.name,
                                  input: event.input,
                                  result: event.result,
                                  status: 'executed' as const,
                                },
                              ],
                            }
                          : m
                      ),
                    }))
                  } else if (event.type === 'error') {
                    set({ error: event.message })
                  }
                } catch {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
          set({
            error: errorMessage,
            isTyping: false,
          })
        }
      },

      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }))
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map(m =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }))
      },

      appendToMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map(m =>
            m.id === id ? { ...m, content: m.content + content } : m
          ),
        }))
      },

      // Context
      setContext: (context) => set({ currentContext: context }),

      // Confirmation flow
      setPendingConfirmation: (confirmation) => set({ pendingConfirmation: confirmation }),

      confirmAction: async () => {
        const { pendingConfirmation, conversationId } = get()
        if (!pendingConfirmation) return

        try {
          const response = await fetch('/api/assistant/execute-tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              messageId: pendingConfirmation.messageId,
              toolName: pendingConfirmation.toolName,
              toolInput: pendingConfirmation.toolInput,
              confirmed: true,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Chyba při provádění akce')
          }

          const result = await response.json()

          // Update message with tool result
          set((state) => ({
            messages: state.messages.map(m =>
              m.id === pendingConfirmation.messageId
                ? {
                    ...m,
                    toolCalls: [
                      ...(m.toolCalls || []),
                      {
                        name: pendingConfirmation.toolName,
                        input: pendingConfirmation.toolInput,
                        result: result.data,
                        status: 'executed' as const,
                      },
                    ],
                  }
                : m
            ),
            pendingConfirmation: null,
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
          set({
            error: errorMessage,
            pendingConfirmation: null,
          })
        }
      },

      cancelAction: () => {
        const { pendingConfirmation } = get()
        if (!pendingConfirmation) return

        // Update message to show cancelled tool
        set((state) => ({
          messages: state.messages.map(m =>
            m.id === pendingConfirmation.messageId
              ? {
                  ...m,
                  toolCalls: [
                    ...(m.toolCalls || []),
                    {
                      name: pendingConfirmation.toolName,
                      input: pendingConfirmation.toolInput,
                      status: 'cancelled' as const,
                    },
                  ],
                }
              : m
          ),
          pendingConfirmation: null,
        }))
      },

      // Conversation management
      setConversationId: (id) => set({ conversationId: id }),

      clearConversation: () => {
        set({
          conversationId: null,
          messages: [],
          pendingConfirmation: null,
          error: null,
        })
      },

      loadConversation: async (id: string) => {
        try {
          const response = await fetch(`/api/assistant/conversations/${id}`)
          if (!response.ok) {
            throw new Error('Nelze načíst konverzaci')
          }

          const data = await response.json()

          // Convert DB messages to ChatMessage format
          const messages: ChatMessage[] = data.messages.map((m: AssistantMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            toolCalls: m.tool_calls,
            createdAt: new Date(m.created_at),
            isStreaming: false,
          }))

          set({
            conversationId: id,
            messages,
            showHistory: false,
            error: null,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
          set({ error: errorMessage })
        }
      },

      loadConversationsList: async () => {
        set({ isLoadingConversations: true })
        try {
          const response = await fetch('/api/assistant/conversations')
          if (!response.ok) {
            throw new Error('Nelze načíst historii konverzací')
          }

          const data = await response.json()
          set({
            conversations: data.conversations || [],
            isLoadingConversations: false,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
          set({
            error: errorMessage,
            isLoadingConversations: false,
          })
        }
      },

      deleteConversation: async (id: string) => {
        try {
          const response = await fetch(`/api/assistant/conversations?id=${id}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            throw new Error('Nelze smazat konverzaci')
          }

          // Remove from list
          set((state) => ({
            conversations: state.conversations.filter(c => c.id !== id),
            // If deleted conversation is active, clear it
            ...(state.conversationId === id ? {
              conversationId: null,
              messages: [],
            } : {}),
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba'
          set({ error: errorMessage })
        }
      },

      startNewConversation: () => {
        set({
          conversationId: null,
          messages: [],
          showHistory: false,
          pendingConfirmation: null,
          error: null,
        })
      },

      toggleHistory: () => {
        const { showHistory } = get()
        if (!showHistory) {
          // Load conversations when showing history
          get().loadConversationsList()
        }
        set({ showHistory: !showHistory })
      },

      // Typing indicator
      setTyping: (isTyping) => set({ isTyping }),

      // Error handling
      setError: (error) => set({ error }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'rentmil-assistant',
      partialize: () => ({
        // Don't persist anything to ensure user isolation
        // Each user starts fresh when opening the assistant
      }),
    }
  )
)

// Selector hooks for performance
export const useAssistantIsOpen = () => useAssistantStore((state) => state.isOpen)
export const useAssistantMessages = () => useAssistantStore((state) => state.messages)
export const useAssistantIsTyping = () => useAssistantStore((state) => state.isTyping)
export const useAssistantError = () => useAssistantStore((state) => state.error)
export const useAssistantPendingConfirmation = () => useAssistantStore((state) => state.pendingConfirmation)
export const useAssistantShowHistory = () => useAssistantStore((state) => state.showHistory)
export const useAssistantConversations = () => useAssistantStore((state) => state.conversations)
export const useAssistantIsLoadingConversations = () => useAssistantStore((state) => state.isLoadingConversations)
