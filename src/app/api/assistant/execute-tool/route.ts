import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeTool } from '@/lib/assistant/tool-handlers'
import { requiresConfirmation } from '@/lib/assistant/tools'

export const dynamic = 'force-dynamic'

interface ExecuteToolRequest {
  conversationId: string
  messageId: string
  toolName: string
  toolInput: Record<string, unknown>
  confirmed: boolean
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
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Parse request
    const body: ExecuteToolRequest = await request.json()
    const { conversationId, messageId, toolName, toolInput, confirmed } = body

    // Validate required fields
    if (!conversationId || !toolName || !toolInput) {
      return NextResponse.json(
        { error: 'Chybí povinné parametry' },
        { status: 400 }
      )
    }

    // Check if tool requires confirmation
    if (requiresConfirmation(toolName) && !confirmed) {
      return NextResponse.json(
        { error: 'Tato akce vyžaduje potvrzení' },
        { status: 400 }
      )
    }

    // Verify user owns the conversation
    const adminClient = await createAdminClient()
    const { data: conversation, error: convError } = await adminClient
      .from('assistant_conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Konverzace nenalezena' },
        { status: 404 }
      )
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Nemáte oprávnění k této konverzaci' },
        { status: 403 }
      )
    }

    // Execute the tool
    const result = await executeTool(toolName, toolInput)

    // Log to audit table
    await adminClient.from('assistant_audit_log').insert({
      user_id: user.id,
      conversation_id: conversationId,
      message_id: messageId || null,
      tool_name: toolName,
      tool_input: toolInput,
      tool_result: result.data as Record<string, unknown> | null,
      success: result.success,
      error_message: result.error || null,
      affected_table: getAffectedTable(toolName),
      affected_record_id: getAffectedRecordId(toolInput),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Chyba při provádění akce' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('Execute tool error:', error)
    const message = error instanceof Error ? error.message : 'Neznámá chyba'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Get the table name affected by the tool
 */
function getAffectedTable(toolName: string): string | null {
  const tableMap: Record<string, string> = {
    update_quote_item: 'quote_items',
    add_quote_item: 'quote_items',
    remove_quote_item: 'quote_items',
    apply_discount: 'quote_variants',
    update_quote_status: 'quotes',
    add_note: 'quotes', // Can also be orders or configurations
  }
  return tableMap[toolName] || null
}

/**
 * Extract the record ID from tool input
 */
function getAffectedRecordId(input: Record<string, unknown>): string | null {
  // Try common ID field names
  const idFields = ['quote_id', 'order_id', 'item_id', 'entity_id', 'configuration_id']

  for (const field of idFields) {
    if (input[field] && typeof input[field] === 'string') {
      return input[field] as string
    }
  }

  return null
}
