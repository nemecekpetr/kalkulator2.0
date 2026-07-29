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
      .select('id, order_number, status, quote_variant_key')
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
    const { data: allQuoteItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    // If the order was created from a specific quote variant, only sync that
    // variant's items and pricing — mirrors the logic in convert/route.ts.
    // Without this, a multi-variant quote would dump ALL variants' items into
    // the order and use quote-level totals (which are always the sum across
    // all variants, not any single variant's total).
    //
    // Look up the variant by its stable variant_key, not a stored row id —
    // quote_variants rows get deleted and recreated (new id) on every quote
    // save, and saveQuote() always runs right before this endpoint is called.
    let quoteItems = allQuoteItems || []
    let syncSubtotal = quote.subtotal
    let syncDiscountPercent = quote.discount_percent
    let syncDiscountAmount = quote.discount_amount
    let syncTotalPrice = quote.total_price

    if (order.quote_variant_key) {
      const { data: variant, error: variantError } = await supabase
        .from('quote_variants')
        .select('*')
        .eq('variant_key', order.quote_variant_key)
        .eq('quote_id', id)
        .single()

      if (variantError || !variant) {
        return new NextResponse('Varianta, ze které objednávka vznikla, už neexistuje', { status: 400 })
      }

      syncSubtotal = variant.subtotal
      syncDiscountPercent = variant.discount_percent
      syncDiscountAmount = variant.discount_amount
      syncTotalPrice = variant.total_price

      const { data: variantItemAssocs, error: assocError } = await supabase
        .from('quote_item_variants')
        .select('quote_item_id')
        .eq('quote_variant_id', variant.id)

      if (assocError) {
        console.error('Error loading variant item associations:', assocError)
        return new NextResponse('Nepodařilo se načíst položky varianty', { status: 500 })
      }

      // Filter to exactly this variant's items — including the case where it
      // has none. Falling back to "all items" here would silently merge every
      // variant's items into the order while still using this variant's price.
      const variantItemIds = new Set((variantItemAssocs || []).map((a) => a.quote_item_id))
      quoteItems = quoteItems.filter((item) => variantItemIds.has(item.id))
    }

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
        subtotal: syncSubtotal,
        discount_percent: syncDiscountPercent,
        discount_amount: syncDiscountAmount,
        total_price: syncTotalPrice,
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
