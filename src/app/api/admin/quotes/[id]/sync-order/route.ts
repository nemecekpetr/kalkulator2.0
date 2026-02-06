import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { OrderItemInsert } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get quote with pricing and customer info
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, customer_name, customer_email, customer_phone, customer_address, pool_config, subtotal, discount_percent, discount_amount, total_price')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return new NextResponse('Nabídka nenalezena', { status: 404 })
    }

    // Find associated order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('quote_id', id)
      .single()

    if (orderError || !order) {
      return new NextResponse('K této nabídce neexistuje objednávka', { status: 404 })
    }

    // Safety check: don't update orders in production
    if (order.status === 'in_production') {
      return NextResponse.json(
        { error: 'Objednávku ve výrobě nelze aktualizovat' },
        { status: 400 }
      )
    }

    // Get current quote items
    const { data: quoteItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    // Delete existing order items
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', order.id)

    if (deleteError) {
      console.error('Error deleting order items:', deleteError)
      return new NextResponse('Nepodařilo se smazat položky objednávky', { status: 500 })
    }

    // Insert new order items from quote items
    if (quoteItems && quoteItems.length > 0) {
      const orderItems: OrderItemInsert[] = quoteItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        sort_order: item.sort_order,
      }))

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (insertError) {
        console.error('Error inserting order items:', insertError)
        return new NextResponse('Nepodařilo se vytvořit položky objednávky', { status: 500 })
      }
    }

    // Update order: customer info, pricing, pool config
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        customer_address: quote.customer_address,
        pool_config: quote.pool_config,
        subtotal: quote.subtotal,
        discount_percent: quote.discount_percent,
        discount_amount: quote.discount_amount,
        total_price: quote.total_price,
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order pricing:', updateError)
      return new NextResponse('Nepodařilo se aktualizovat ceny objednávky', { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    })
  } catch (error) {
    console.error('Sync order error:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}
