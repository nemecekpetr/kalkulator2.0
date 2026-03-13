import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import type { QuoteStatus } from '@/lib/supabase/types'

const VALID_STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected']

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { ids, status } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Žádná ID nebyla poskytnuta' }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Neplatný stav nabídky' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Build update data with timestamps
    const updateData: Record<string, unknown> = { status }
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString()
    } else if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('quotes')
      .update(updateData)
      .in('id', ids)

    if (error) {
      console.error('Error bulk updating quote status:', error)
      return NextResponse.json({ error: 'Nepodařilo se změnit stav nabídek' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (error) {
    console.error('Bulk status quotes error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
