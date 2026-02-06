import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { QuoteStatus, OrderItemInsert } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get quote with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return new NextResponse('Nabídka nenalezena', { status: 404 })
    }

    // Check if quote is in accepted status
    const status = (quote.status || 'draft') as QuoteStatus
    if (status !== 'accepted') {
      return new NextResponse(
        'Pouze akceptované nabídky lze převést na objednávku',
        { status: 400 }
      )
    }

    // Get quote items
    const { data: quoteItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    // Use database function to generate order number (atomic, no race condition)
    const { data: orderNumberResult, error: seqError } = await supabase
      .rpc('generate_order_number')

    if (seqError || !orderNumberResult) {
      console.error('Error generating order number:', seqError)
      return new NextResponse('Nepodařilo se vygenerovat číslo objednávky', { status: 500 })
    }

    const orderNumber = orderNumberResult as string

    // === TRANSACTION: Create order, items, and update quote status atomically ===
    // Supabase doesn't have native transactions in JS client, so we use a DB function
    // For now, we'll do our best with sequential operations and rollback on failure

    // Step 1: Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        quote_id: quote.id,
        status: 'created',
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        customer_address: quote.customer_address,
        delivery_term: quote.delivery_term || '4-8 týdnů',
        fulfillment_address: quote.customer_address,
        delivery_method: 'rentmil_dap',
        delivery_cost_free: true,
        delivery_cost: 0,
        vat_rate: 12,
        pool_config: quote.pool_config,
        subtotal: quote.subtotal,
        discount_percent: quote.discount_percent,
        discount_amount: quote.discount_amount,
        total_price: quote.total_price,
        notes: quote.notes,
        created_by: quote.created_by,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating order:', orderError)
      return new NextResponse('Nepodařilo se vytvořit objednávku', { status: 500 })
    }

    // Step 2: Copy items to order
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items, rolling back order:', itemsError)
        // Rollback: delete the order we just created
        await supabase.from('orders').delete().eq('id', order.id)
        return new NextResponse('Nepodařilo se vytvořit položky objednávky', { status: 500 })
      }
    }

    // Quote stays in 'accepted' status - the order is now the active entity
    // No status update needed since 'converted' status was removed

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    })
  } catch (error) {
    console.error('Quote to order conversion error:', error)
    return new NextResponse('Chyba serveru', { status: 500 })
  }
}
