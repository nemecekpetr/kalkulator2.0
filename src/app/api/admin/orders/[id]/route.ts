import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'
import { OrderUpdateSchema, validateBody } from '@/lib/validations/api'
import type { OrderUpdate } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single()

    if (error || !order) {
      return new NextResponse('Objednávka nenalezena', { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = validateBody(body, OrderUpdateSchema)
    if (!validation.success) {
      return new NextResponse(`Neplatná data: ${validation.error}`, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Build update data with sanitization
    const updateData: OrderUpdate = {}

    // Customer fields (sanitized)
    if (body.customer_name !== undefined) updateData.customer_name = sanitizeText(body.customer_name)
    if (body.customer_email !== undefined) updateData.customer_email = sanitizeEmail(body.customer_email)
    if (body.customer_phone !== undefined) updateData.customer_phone = sanitizePhone(body.customer_phone)
    if (body.customer_address !== undefined) updateData.customer_address = sanitizeText(body.customer_address)
    if (body.customer_ico !== undefined) updateData.customer_ico = sanitizeText(body.customer_ico)
    if (body.customer_dic !== undefined) updateData.customer_dic = sanitizeText(body.customer_dic)

    // Contract & delivery fields
    if (body.contract_date !== undefined) updateData.contract_date = body.contract_date
    if (body.delivery_date !== undefined) updateData.delivery_date = body.delivery_date
    if (body.delivery_address !== undefined) updateData.delivery_address = sanitizeText(body.delivery_address)

    // Payment fields
    if (body.deposit_amount !== undefined) updateData.deposit_amount = body.deposit_amount
    if (body.deposit_paid_at !== undefined) updateData.deposit_paid_at = body.deposit_paid_at
    if (body.final_payment_at !== undefined) updateData.final_payment_at = body.final_payment_at

    // Notes (sanitized)
    if (body.notes !== undefined) updateData.notes = sanitizeText(body.notes)
    if (body.internal_notes !== undefined) updateData.internal_notes = sanitizeText(body.internal_notes)

    // Update order
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating order:', error)
      return new NextResponse('Nepodařilo se aktualizovat objednávku', { status: 500 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order update error:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Check if order exists
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return new NextResponse('Objednávka nenalezena', { status: 404 })
    }

    // Only allow deleting orders in 'created' status
    if (order.status !== 'created') {
      return new NextResponse(
        'Lze mazat pouze objednávky ve stavu "Vytvořena"',
        { status: 400 }
      )
    }

    // Delete order (items will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting order:', deleteError)
      return new NextResponse('Nepodařilo se smazat objednávku', { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order delete error:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}
