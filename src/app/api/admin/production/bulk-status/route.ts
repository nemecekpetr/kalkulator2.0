import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import type { ProductionStatus } from '@/lib/supabase/types'

const VALID_STATUSES: ProductionStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { ids, status } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Žádná ID nebyla poskytnuta' }, { status: 400 })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Neplatný stav výrobního zadání' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('production_orders')
      .update({ status })
      .in('id', ids)

    if (error) {
      console.error('Error bulk updating production status:', error)
      return NextResponse.json({ error: 'Nepodařilo se změnit stav výrobních zadání' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (error) {
    console.error('Bulk status production error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
