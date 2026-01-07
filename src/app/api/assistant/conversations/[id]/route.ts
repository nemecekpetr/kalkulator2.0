import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    // Get conversation
    const { data: conversation, error: convError } = await adminClient
      .from('assistant_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return Response.json({ error: 'Konverzace nenalezena' }, { status: 404 })
    }

    // Get messages
    const { data: messages, error: msgError } = await adminClient
      .from('assistant_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return Response.json({ error: 'Chyba při načítání zpráv' }, { status: 500 })
    }

    return Response.json({ conversation, messages })
  } catch (error) {
    console.error('Get conversation error:', error)
    return Response.json({ error: 'Neznámá chyba' }, { status: 500 })
  }
}
