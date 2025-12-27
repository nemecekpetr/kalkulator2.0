import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Update item checked status
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: productionOrderId } = await params
    const body = await request.json()
    const { item_id, checked } = body

    if (!item_id || typeof checked !== 'boolean') {
      return NextResponse.json({ error: 'item_id a checked jsou povinné' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Verify item belongs to this production order
    const { data: item, error: fetchError } = await supabase
      .from('production_order_items')
      .select('id')
      .eq('id', item_id)
      .eq('production_order_id', productionOrderId)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Položka nenalezena' }, { status: 404 })
    }

    // Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('production_order_items')
      .update({
        checked,
        checked_at: checked ? new Date().toISOString() : null,
      })
      .eq('id', item_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating item:', updateError)
      return NextResponse.json({ error: 'Nepodařilo se aktualizovat položku' }, { status: 500 })
    }

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Item update error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}

// Add new item to production order
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: productionOrderId } = await params
    const body = await request.json()

    const supabase = await createAdminClient()

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from('production_order_items')
      .select('sort_order')
      .eq('production_order_id', productionOrderId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (maxOrder?.sort_order || 0) + 1

    const { data: newItem, error } = await supabase
      .from('production_order_items')
      .insert({
        production_order_id: productionOrderId,
        material_code: body.material_code || null,
        material_name: body.material_name,
        description: body.description || null,
        quantity: body.quantity || 1,
        unit: body.unit || 'ks',
        category: body.category || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating item:', error)
      return NextResponse.json({ error: 'Nepodařilo se přidat položku' }, { status: 500 })
    }

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Item create error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}

// Delete item from production order
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: productionOrderId } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')

    if (!itemId) {
      return NextResponse.json({ error: 'item_id je povinný' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('production_order_items')
      .delete()
      .eq('id', itemId)
      .eq('production_order_id', productionOrderId)

    if (error) {
      console.error('Error deleting item:', error)
      return NextResponse.json({ error: 'Nepodařilo se smazat položku' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Item delete error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
