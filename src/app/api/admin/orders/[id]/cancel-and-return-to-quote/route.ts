import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import { validateCsrf } from '@/lib/csrf'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Stornuje objednávku a vrátí quote_id pro redirect na editaci nabídky.
 * Dovolíme jen ve stavech 'created' a 'sent' — po předání do výroby
 * by storno ohrozilo běžící zakázku.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  const csrfError = await validateCsrf()
  if (csrfError) return csrfError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, quote_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })
    }

    if (order.status !== 'created' && order.status !== 'sent') {
      return NextResponse.json(
        { error: `Objednávku ve stavu „${order.status}" nelze vrátit k úpravě nabídky` },
        { status: 400 }
      )
    }

    if (!order.quote_id) {
      return NextResponse.json(
        { error: 'Objednávka nemá vazbu na nabídku — nelze vrátit k úpravě' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (updateError) {
      console.error('Cancel order failed:', updateError)
      return NextResponse.json({ error: 'Storno se nepodařilo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, quoteId: order.quote_id })
  } catch (error) {
    console.error('Error in cancel-and-return-to-quote:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
