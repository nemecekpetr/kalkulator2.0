import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_TOOLS, requiresConfirmation, getToolConfirmationDescription } from '@/lib/assistant/tools'
import { buildSystemPrompt } from '@/lib/assistant/system-prompt'
import { executeTool } from '@/lib/assistant/tool-handlers'
import type { AssistantPageContext, AssistantMessageInsert } from '@/lib/supabase/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  message: string
  conversationId?: string
  pageContext: AssistantPageContext
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Parse request
    const body: ChatRequest = await request.json()
    const { message, conversationId, pageContext, history = [] } = body

    if (!message?.trim()) {
      return Response.json({ error: 'Zpráva je povinná' }, { status: 400 })
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY není nakonfigurován' },
        { status: 500 }
      )
    }

    // Get or create conversation
    const adminClient = await createAdminClient()
    let activeConversationId = conversationId

    if (!activeConversationId) {
      // Create new conversation
      const { data: newConversation, error: convError } = await adminClient
        .from('assistant_conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        })
        .select('id')
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        return Response.json(
          { error: 'Nepodařilo se vytvořit konverzaci' },
          { status: 500 }
        )
      }

      activeConversationId = newConversation.id
    }

    // Save user message to DB
    await adminClient.from('assistant_messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: message,
      page_context: pageContext,
    } as AssistantMessageInsert)

    // TODO: RAG search for relevant knowledge
    // For now, we'll skip RAG until the indexing script is created
    const ragResults: { title: string; content: string; source_url: string }[] = []

    // Build system prompt
    const systemPrompt = buildSystemPrompt(pageContext, ragResults)

    // Build messages array for Claude
    const claudeMessages: Anthropic.MessageParam[] = [
      // Include recent history (filter out empty messages)
      ...history
        .filter((h) => h.content && h.content.trim().length > 0)
        .map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
      // Current message
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Create Anthropic client
    const anthropic = new Anthropic({ apiKey })

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          // Send conversation ID
          sendEvent('conversation_id', { id: activeConversationId })
          console.log('[Assistant] Starting chat, message:', message.substring(0, 50))

          // Call Claude with streaming
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: claudeMessages,
            tools: ALL_TOOLS,
            stream: true,
          })

          let fullContent = ''
          let currentToolUse: {
            id: string
            name: string
            input: string
          } | null = null

          for await (const event of response) {
            if (event.type === 'content_block_start') {
              if (event.content_block.type === 'tool_use') {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: '',
                }
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                fullContent += event.delta.text
                sendEvent('delta', { content: event.delta.text })
              } else if (event.delta.type === 'input_json_delta') {
                if (currentToolUse) {
                  currentToolUse.input += event.delta.partial_json
                }
              }
            } else if (event.type === 'content_block_stop') {
              if (currentToolUse) {
                // Parse tool input
                let toolInput: Record<string, unknown> = {}
                try {
                  toolInput = JSON.parse(currentToolUse.input || '{}')
                } catch {
                  console.error('Failed to parse tool input:', currentToolUse.input)
                }

                const toolName = currentToolUse.name
                console.log('[Assistant] Tool call:', toolName, 'input:', JSON.stringify(toolInput).substring(0, 100))

                // Check if tool requires confirmation
                if (requiresConfirmation(toolName)) {
                  const description = getToolConfirmationDescription(toolName, toolInput)
                  sendEvent('tool_use', {
                    name: toolName,
                    input: toolInput,
                    requires_confirmation: true,
                    description,
                  })
                } else {
                  // Execute read tool immediately
                  sendEvent('tool_use', {
                    name: toolName,
                    input: toolInput,
                    requires_confirmation: false,
                  })

                  const result = await executeTool(toolName, toolInput)

                  sendEvent('tool_result', {
                    name: toolName,
                    input: toolInput,
                    result: result.data,
                    success: result.success,
                    error: result.error,
                  })

                  // If tool was successful, continue conversation with result
                  if (result.success) {
                    console.log('[Assistant] Read tool succeeded, making follow-up call')
                    // Make another Claude call with tool result
                    const followUpResponse = await anthropic.messages.create({
                      model: 'claude-sonnet-4-20250514',
                      max_tokens: 2048,
                      system: systemPrompt,
                      messages: [
                        ...claudeMessages,
                        {
                          role: 'assistant',
                          content: [
                            // Only include text block if there's actual content
                            ...(fullContent && fullContent.trim().length > 0 ? [{ type: 'text' as const, text: fullContent }] : []),
                            {
                              type: 'tool_use' as const,
                              id: currentToolUse.id,
                              name: toolName,
                              input: toolInput,
                            },
                          ],
                        },
                        {
                          role: 'user',
                          content: [
                            {
                              type: 'tool_result' as const,
                              tool_use_id: currentToolUse.id,
                              content: JSON.stringify(result.data),
                            },
                          ],
                        },
                      ],
                      tools: ALL_TOOLS, // IMPORTANT: Allow Claude to call tools in follow-up
                      stream: true,
                    })

                    // Process follow-up response including any tool calls
                    let followUpToolUse: {
                      id: string
                      name: string
                      input: string
                    } | null = null
                    let followUpText = ''

                    for await (const followUpEvent of followUpResponse) {
                      if (followUpEvent.type === 'content_block_start') {
                        console.log('[Assistant] Follow-up content_block_start:', followUpEvent.content_block.type)
                        if (followUpEvent.content_block.type === 'tool_use') {
                          followUpToolUse = {
                            id: followUpEvent.content_block.id,
                            name: followUpEvent.content_block.name,
                            input: '',
                          }
                        }
                      } else if (followUpEvent.type === 'content_block_delta') {
                        if (followUpEvent.delta.type === 'text_delta') {
                          followUpText += followUpEvent.delta.text
                          fullContent += followUpEvent.delta.text
                          sendEvent('delta', { content: followUpEvent.delta.text })
                        } else if (followUpEvent.delta.type === 'input_json_delta') {
                          if (followUpToolUse) {
                            followUpToolUse.input += followUpEvent.delta.partial_json
                          }
                        }
                      } else if (followUpEvent.type === 'content_block_stop') {
                        if (followUpToolUse) {
                          // Parse and handle the follow-up tool call
                          let followUpToolInput: Record<string, unknown> = {}
                          try {
                            followUpToolInput = JSON.parse(followUpToolUse.input || '{}')
                          } catch {
                            console.error('Failed to parse follow-up tool input:', followUpToolUse.input)
                          }

                          const followUpToolName = followUpToolUse.name
                          console.log('[Assistant] Follow-up tool call:', followUpToolName, 'input:', JSON.stringify(followUpToolInput).substring(0, 100))

                          if (requiresConfirmation(followUpToolName)) {
                            console.log('[Assistant] Tool requires confirmation, sending confirmation event')
                            // Write tool - needs confirmation
                            const description = getToolConfirmationDescription(followUpToolName, followUpToolInput)
                            sendEvent('tool_use', {
                              name: followUpToolName,
                              input: followUpToolInput,
                              requires_confirmation: true,
                              description,
                            })
                          } else {
                            // Read tool - execute immediately
                            sendEvent('tool_use', {
                              name: followUpToolName,
                              input: followUpToolInput,
                              requires_confirmation: false,
                            })

                            const followUpResult = await executeTool(followUpToolName, followUpToolInput)

                            sendEvent('tool_result', {
                              name: followUpToolName,
                              input: followUpToolInput,
                              result: followUpResult.data,
                              success: followUpResult.success,
                              error: followUpResult.error,
                            })
                          }

                          followUpToolUse = null
                        }
                      } else if (followUpEvent.type === 'message_stop') {
                        console.log('[Assistant] Follow-up message_stop, text length:', followUpText.length, 'tool_use:', followUpToolUse !== null)
                      }
                    }
                  }
                }

                currentToolUse = null
              }
            } else if (event.type === 'message_stop') {
              // Save assistant message to DB
              await adminClient.from('assistant_messages').insert({
                conversation_id: activeConversationId,
                role: 'assistant',
                content: fullContent,
                page_context: pageContext,
              } as AssistantMessageInsert)
            }
          }

          // Send done event
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          console.error('Streaming error:', error)
          const errorMessage =
            error instanceof Error ? error.message : 'Neznámá chyba'
          sendEvent('error', { message: errorMessage })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const message = error instanceof Error ? error.message : 'Neznámá chyba'
    return Response.json({ error: message }, { status: 500 })
  }
}
