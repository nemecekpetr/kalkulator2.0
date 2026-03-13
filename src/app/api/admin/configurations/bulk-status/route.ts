import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import type { ConfigurationStatus } from '@/lib/supabase/types'

const VALID_STATUSES: ConfigurationStatus[] = ['new', 'processed']

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { ids, status } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Žádná ID nebyla poskytnuta' }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Neplatný stav konfigurace' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('configurations')
      .update({ status })
      .in('id', ids)

    if (error) {
      console.error('Error bulk updating configuration status:', error)
      return NextResponse.json({ error: 'Nepodařilo se změnit stav konfigurací' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (error) {
    console.error('Bulk status configurations error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
