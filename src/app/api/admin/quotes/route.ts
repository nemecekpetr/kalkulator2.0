import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const QuoteItemSchema = z.object({
  product_id: z.string().nullable(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['bazeny', 'prislusenstvi', 'sluzby', 'prace', 'doprava', 'jine']),
  quantity: z.number().min(0),
  unit: z.string(),
  unit_price: z.number().min(0),
  total_price: z.number().min(0),
  sort_order: z.number(),
})

const QuoteSchema = z.object({
  id: z.string().optional(),
  quote_number: z.string(),
  configuration_id: z.string().nullable(),
  customer_name: z.string().min(1),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  pool_config: z.any().nullable(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(QuoteItemSchema),
})

// GET - list all quotes
export async function GET() {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání nabídek' },
      { status: 500 }
    )
  }
}

// POST - create new quote
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = QuoteSchema.parse(body)

    // Get current user ID for created_by
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()

    const supabase = await createAdminClient()

    // Calculate totals
    const subtotal = validatedData.items.reduce((sum, item) => sum + item.total_price, 0)

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: validatedData.quote_number,
        configuration_id: validatedData.configuration_id,
        customer_name: validatedData.customer_name,
        customer_email: validatedData.customer_email || null,
        customer_phone: validatedData.customer_phone || null,
        customer_address: validatedData.customer_address || null,
        pool_config: validatedData.pool_config,
        valid_until: validatedData.valid_until || null,
        notes: validatedData.notes || null,
        subtotal,
        total_price: subtotal,
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (quoteError) throw quoteError

    // Create quote items
    if (validatedData.items.length > 0) {
      const { error: itemsError } = await supabase.from('quote_items').insert(
        validatedData.items.map((item) => ({
          quote_id: quote.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description || null,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: item.sort_order,
        }))
      )

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ id: quote.id, success: true })
  } catch (error) {
    console.error('Error creating quote:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Neplatná data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Chyba při vytváření nabídky' },
      { status: 500 }
    )
  }
}

// PUT - update existing quote
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const validatedData = QuoteSchema.parse(body)

    if (!validatedData.id) {
      return NextResponse.json(
        { error: 'Chybí ID nabídky' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Calculate totals
    const subtotal = validatedData.items.reduce((sum, item) => sum + item.total_price, 0)

    // Update quote (don't update created_by on edit)
    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        customer_name: validatedData.customer_name,
        customer_email: validatedData.customer_email || null,
        customer_phone: validatedData.customer_phone || null,
        customer_address: validatedData.customer_address || null,
        pool_config: validatedData.pool_config,
        valid_until: validatedData.valid_until || null,
        notes: validatedData.notes || null,
        subtotal,
        total_price: subtotal,
      })
      .eq('id', validatedData.id)

    if (quoteError) throw quoteError

    // Delete existing items and re-create
    await supabase.from('quote_items').delete().eq('quote_id', validatedData.id)

    if (validatedData.items.length > 0) {
      const { error: itemsError } = await supabase.from('quote_items').insert(
        validatedData.items.map((item) => ({
          quote_id: validatedData.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description || null,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: item.sort_order,
        }))
      )

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ id: validatedData.id, success: true })
  } catch (error) {
    console.error('Error updating quote:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Neplatná data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Chyba při aktualizaci nabídky' },
      { status: 500 }
    )
  }
}
