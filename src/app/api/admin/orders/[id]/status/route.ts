import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus } from '@/lib/supabase/types'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

const VALID_STATUSES: OrderStatus[] = ['created', 'sent', 'in_production']

export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body as { status: OrderStatus }

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return new NextResponse('Neplatný stav objednávky', { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get current order to verify it exists
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return new NextResponse('Objednávka nenalezena', { status: 404 })
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating order status:', updateError)
      return new NextResponse('Nepodařilo se aktualizovat stav', { status: 500 })
    }

    // Note: The database trigger will automatically create a production order
    // when status changes to 'in_production'

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Order status update error:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}
