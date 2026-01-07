import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import { ProductionOrderCreateSchema, validateBody } from '@/lib/validations/api'

export async function GET() {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  try {
    const supabase = await createAdminClient()

    const { data: productionOrders, error } = await supabase
      .from('production_orders')
      .select('*, orders(order_number, customer_name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching production orders:', error)
      return NextResponse.json({ error: 'Nepodařilo se načíst výrobní zadání' }, { status: 500 })
    }

    return NextResponse.json(productionOrders)
  } catch (error) {
    console.error('Production orders fetch error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}

// Helper function to safely parse pool dimensions
function formatPoolDimensions(poolConfig: Record<string, unknown> | null): string | null {
  if (!poolConfig?.dimensions) return null

  const dims = poolConfig.dimensions as Record<string, unknown>
  const width = typeof dims.width === 'number' ? dims.width : null
  const length = typeof dims.length === 'number' ? dims.length : null
  const diameter = typeof dims.diameter === 'number' ? dims.diameter : null

  // For circular pools (diameter only)
  if (diameter && !width && !length) {
    return `${diameter}m`
  }

  // For rectangular pools (width x length)
  if (width && length) {
    return `${width}×${length}m`
  }

  // Fallback - return whatever we have
  if (width) return `${width}m`
  if (diameter) return `${diameter}m`

  return null
}

function formatPoolDepth(poolConfig: Record<string, unknown> | null): string | null {
  if (!poolConfig?.dimensions) return null

  const dims = poolConfig.dimensions as Record<string, unknown>
  const depth = typeof dims.depth === 'number' ? dims.depth : null

  if (depth) {
    return `${depth}m`
  }

  return null
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  try {
    const body = await request.json()

    // Validate request body
    const validation = validateBody(body, ProductionOrderCreateSchema)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { order_id } = validation.data

    const supabase = await createAdminClient()

    // Fetch order with items (including product code via relation)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*, products(code))')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })
    }

    // Generate production number
    const { data: numberResult } = await supabase.rpc('generate_production_number')
    const productionNumber = numberResult || `VYR-${new Date().getFullYear()}-0001`

    // Extract and validate pool config from order
    const poolConfig = order.pool_config as Record<string, unknown> | null

    // Create production order
    // UNIQUE constraint on order_id prevents duplicates (handles race condition)
    const { data: productionOrder, error: createError } = await supabase
      .from('production_orders')
      .insert({
        production_number: productionNumber,
        order_id: order_id,
        status: 'pending',
        pool_shape: typeof poolConfig?.shape === 'string' ? poolConfig.shape : null,
        pool_type: typeof poolConfig?.type === 'string' ? poolConfig.type : null,
        pool_dimensions: formatPoolDimensions(poolConfig),
        pool_color: typeof poolConfig?.color === 'string' ? poolConfig.color : null,
        pool_depth: formatPoolDepth(poolConfig),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating production order:', createError)

      // Check for unique constraint violation (duplicate order_id)
      if (createError.code === '23505') {
        // Fetch the existing production order to show its number
        const { data: existing } = await supabase
          .from('production_orders')
          .select('production_number')
          .eq('order_id', order_id)
          .single()

        return NextResponse.json({
          error: `Výrobní zadání pro tuto objednávku již existuje${existing ? ` (${existing.production_number})` : ''}`
        }, { status: 409 })
      }

      return NextResponse.json({ error: 'Nepodařilo se vytvořit výrobní zadání' }, { status: 500 })
    }

    // Create production order items from order items
    const orderItems = order.order_items as Array<{
      name: string
      description: string | null
      quantity: number
      unit: string
      category: string
      products: { code: string | null } | null
    }> || []

    if (orderItems.length > 0) {
      const productionItems = orderItems.map((item, index) => ({
        production_order_id: productionOrder.id,
        material_code: item.products?.code || null,
        material_name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        sort_order: index,
        category: item.category,
      }))

      const { error: itemsError } = await supabase
        .from('production_order_items')
        .insert(productionItems)

      if (itemsError) {
        console.error('Error creating production order items, rolling back:', itemsError)
        // Rollback: delete production order
        await supabase.from('production_orders').delete().eq('id', productionOrder.id)
        return NextResponse.json({ error: 'Nepodařilo se vytvořit položky výrobního zadání' }, { status: 500 })
      }
    }

    // Update order status to in_production
    const { error: statusError } = await supabase
      .from('orders')
      .update({ status: 'in_production' })
      .eq('id', order_id)

    if (statusError) {
      console.error('Error updating order status, rolling back:', statusError)
      // Rollback: delete production order (items cascade)
      await supabase.from('production_orders').delete().eq('id', productionOrder.id)
      return NextResponse.json({ error: 'Nepodařilo se aktualizovat stav objednávky' }, { status: 500 })
    }

    return NextResponse.json(productionOrder, { status: 201 })
  } catch (error) {
    console.error('Production order create error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
