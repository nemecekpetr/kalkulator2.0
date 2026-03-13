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

    // Parse optional variantId from body
    const body = await request.json().catch(() => ({}))
    const { variantId } = body as { variantId?: string }

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
    const { data: allQuoteItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    // If variant specified, filter items and use variant pricing
    let quoteItems = allQuoteItems || []
    let orderSubtotal = quote.subtotal
    let orderDiscountPercent = quote.discount_percent
    let orderDiscountAmount = quote.discount_amount
    let orderTotalPrice = quote.total_price

    if (variantId) {
      // Fetch variant data for pricing
      const { data: variant, error: variantError } = await supabase
        .from('quote_variants')
        .select('*')
        .eq('id', variantId)
        .eq('quote_id', id)
        .single()

      if (variantError || !variant) {
        return new NextResponse('Varianta nenalezena', { status: 404 })
      }

      // Use variant pricing
      orderSubtotal = variant.subtotal
      orderDiscountPercent = variant.discount_percent
      orderDiscountAmount = variant.discount_amount
      orderTotalPrice = variant.total_price

      // Filter items by variant via junction table
      const { data: variantItemAssocs } = await supabase
        .from('quote_item_variants')
        .select('quote_item_id')
        .eq('quote_variant_id', variantId)

      if (variantItemAssocs && variantItemAssocs.length > 0) {
        const variantItemIds = new Set(variantItemAssocs.map((a) => a.quote_item_id))
        quoteItems = quoteItems.filter((item) => variantItemIds.has(item.id))
      }
    }

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
        vat_rate: quote.vat_rate ?? 0,
        pool_config: quote.pool_config,
        subtotal: orderSubtotal,
        discount_percent: orderDiscountPercent,
        discount_amount: orderDiscountAmount,
        total_price: orderTotalPrice,
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
    if (quoteItems.length > 0) {
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
