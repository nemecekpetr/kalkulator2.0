import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { QuoteStatus } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

const VALID_STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected']

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body as { status: QuoteStatus }

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return new NextResponse('Neplatný stav nabídky', { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get current quote to verify it exists
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !quote) {
      return new NextResponse('Nabídka nenalezena', { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { status }

    // Add timestamps for specific statuses
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString()
    } else if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    }

    // Update quote status
    const { error: updateError } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating quote status:', updateError)
      return new NextResponse('Nepodařilo se aktualizovat stav', { status: 500 })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Quote status update error:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}
