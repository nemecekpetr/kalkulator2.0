import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - List user's conversations
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    const { data: conversations, error } = await adminClient
      .from('assistant_conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        is_active
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching conversations:', error)
      return Response.json({ error: 'Chyba při načítání konverzací' }, { status: 500 })
    }

    return Response.json({ conversations })
  } catch (error) {
    console.error('Conversations API error:', error)
    return Response.json({ error: 'Neznámá chyba' }, { status: 500 })
  }
}

// DELETE - Delete a conversation (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('id')

    if (!conversationId) {
      return Response.json({ error: 'ID konverzace je povinné' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // Verify ownership
    const { data: conversation } = await adminClient
      .from('assistant_conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single()

    if (!conversation || conversation.user_id !== user.id) {
      return Response.json({ error: 'Konverzace nenalezena' }, { status: 404 })
    }

    // Soft delete
    const { error } = await adminClient
      .from('assistant_conversations')
      .update({ is_active: false })
      .eq('id', conversationId)

    if (error) {
      console.error('Error deleting conversation:', error)
      return Response.json({ error: 'Chyba při mazání konverzace' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return Response.json({ error: 'Neznámá chyba' }, { status: 500 })
  }
}
