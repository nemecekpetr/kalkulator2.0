import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import type { ProductionOrderUpdate } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data: productionOrder, error } = await supabase
      .from('production_orders')
      .select('*, production_order_items(*), orders(order_number, customer_name, customer_phone, customer_address, delivery_address)')
      .eq('id', id)
      .single()

    if (error || !productionOrder) {
      return NextResponse.json({ error: 'Výrobní zadání nenalezeno' }, { status: 404 })
    }

    return NextResponse.json(productionOrder)
  } catch (error) {
    console.error('Error fetching production order:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createAdminClient()

    // Build update data
    const updateData: ProductionOrderUpdate = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
    if (body.production_start_date !== undefined) updateData.production_start_date = body.production_start_date
    if (body.production_end_date !== undefined) updateData.production_end_date = body.production_end_date
    if (body.assembly_date !== undefined) updateData.assembly_date = body.assembly_date
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes

    // Update production order
    const { data: productionOrder, error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating production order:', error)
      return NextResponse.json({ error: 'Nepodařilo se aktualizovat výrobní zadání' }, { status: 500 })
    }

    // If status changed to completed, update order status
    if (body.status === 'completed' && productionOrder.order_id) {
      await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', productionOrder.order_id)
    }

    return NextResponse.json(productionOrder)
  } catch (error) {
    console.error('Production order update error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Delete production order (items will be cascade deleted via FK)
    const { error: deleteError } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting production order:', deleteError)
      return NextResponse.json({ error: 'Nepodařilo se smazat výrobní zadání' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Production order delete error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
