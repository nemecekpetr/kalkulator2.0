import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { QuoteVariantKey, QuoteItemCategory } from '@/lib/supabase/types'
import { QUOTE_CATEGORIES } from '@/lib/constants/categories'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

// Map old category names to new ones for backwards compatibility
const LEGACY_CATEGORY_MAP: Record<string, QuoteItemCategory> = {
  bazeny: 'skelety',
  prislusenstvi: 'jine',
}

// All valid categories including legacy ones (for validation)
const ALL_VALID_CATEGORIES = [
  ...QUOTE_CATEGORIES,
  ...Object.keys(LEGACY_CATEGORY_MAP),
]

// Normalize category - map legacy to new, pass through valid ones
function normalizeCategory(category: string): QuoteItemCategory {
  if (LEGACY_CATEGORY_MAP[category]) {
    return LEGACY_CATEGORY_MAP[category]
  }
  return category as QuoteItemCategory
}

const QuoteItemSchema = z.object({
  id: z.string().optional(), // For tracking during edit
  product_id: z.string().nullable(),
  name: z.string().min(1),
  description: z.string().optional(),
  // Accept both new and legacy categories - will be normalized before saving
  category: z.enum(ALL_VALID_CATEGORIES as [string, ...string[]]),
  quantity: z.number().min(0),
  unit: z.string(),
  unit_price: z.number().min(0),
  total_price: z.number().min(0),
  sort_order: z.number(),
  variant_keys: z.array(z.enum(['ekonomicka', 'optimalni', 'premiova'])).optional(),
})

const QuoteVariantSchema = z.object({
  variant_key: z.enum(['ekonomicka', 'optimalni', 'premiova']),
  variant_name: z.string(),
  sort_order: z.number().optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
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
  delivery_term: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(QuoteItemSchema),
  variants: z.array(QuoteVariantSchema).optional(),
})

// GET - list all quotes with variants
export async function GET() {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*),
        quote_variants(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // For each quote, fetch item-variant associations
    const quotesWithAssociations = await Promise.all(
      (data || []).map(async (quote) => {
        // Get item-variant associations
        const { data: associations } = await supabase
          .from('quote_item_variants')
          .select('quote_item_id, quote_variant_id')
          .in(
            'quote_item_id',
            (quote.quote_items || []).map((i: { id: string }) => i.id)
          )

        // Add variant_ids to each item
        const itemsWithVariants = (quote.quote_items || []).map((item: { id: string }) => ({
          ...item,
          variant_ids: (associations || [])
            .filter((a) => a.quote_item_id === item.id)
            .map((a) => a.quote_variant_id),
        }))

        return {
          ...quote,
          quote_items: itemsWithVariants,
        }
      })
    )

    return NextResponse.json(quotesWithAssociations)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání nabídek' },
      { status: 500 }
    )
  }
}

// POST - create new quote with variants
export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error
  const { user } = authResult

  try {
    const body = await request.json()
    const validatedData = QuoteSchema.parse(body)

    const supabase = await createAdminClient()

    // Calculate total subtotal (all unique items)
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
        delivery_term: validatedData.delivery_term || '4-8 týdnů',
        notes: validatedData.notes || null,
        subtotal,
        total_price: subtotal,
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (quoteError) throw quoteError

    // Create variants if provided
    const variantIdMap: Record<QuoteVariantKey, string> = {} as Record<QuoteVariantKey, string>

    if (validatedData.variants && validatedData.variants.length > 0) {
      // Calculate subtotal for each variant based on items
      const variantSubtotals: Record<QuoteVariantKey, number> = {
        ekonomicka: 0,
        optimalni: 0,
        premiova: 0,
      }

      validatedData.items.forEach((item) => {
        (item.variant_keys || []).forEach((key) => {
          variantSubtotals[key] += item.total_price
        })
      })

      const variantsToInsert = validatedData.variants.map((v, idx) => {
        const variantSubtotal = variantSubtotals[v.variant_key]
        const discountPercent = v.discount_percent || 0
        const discountAmount = v.discount_amount || 0
        const totalAfterDiscount = variantSubtotal - (variantSubtotal * discountPercent / 100) - discountAmount

        return {
          quote_id: quote.id,
          variant_key: v.variant_key,
          variant_name: v.variant_name,
          sort_order: v.sort_order ?? idx,
          subtotal: variantSubtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          total_price: Math.max(0, totalAfterDiscount),
        }
      })

      const { data: insertedVariants, error: variantsError } = await supabase
        .from('quote_variants')
        .insert(variantsToInsert)
        .select('id, variant_key')

      if (variantsError) throw variantsError

      // Build variant key to ID map
      insertedVariants?.forEach((v) => {
        variantIdMap[v.variant_key as QuoteVariantKey] = v.id
      })
    }

    // Create quote items
    if (validatedData.items.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabase
        .from('quote_items')
        .insert(
          validatedData.items.map((item) => ({
            quote_id: quote.id,
            product_id: item.product_id,
            name: item.name,
            description: item.description || null,
            category: normalizeCategory(item.category), // Map legacy categories
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            sort_order: item.sort_order,
          }))
        )
        .select('id')

      if (itemsError) throw itemsError

      // Create item-variant associations
      const itemVariantAssociations: { quote_item_id: string; quote_variant_id: string }[] = []

      validatedData.items.forEach((item, idx) => {
        const insertedItemId = insertedItems?.[idx]?.id
        if (insertedItemId && item.variant_keys) {
          item.variant_keys.forEach((variantKey) => {
            const variantId = variantIdMap[variantKey]
            if (variantId) {
              itemVariantAssociations.push({
                quote_item_id: insertedItemId,
                quote_variant_id: variantId,
              })
            }
          })
        }
      })

      if (itemVariantAssociations.length > 0) {
        const { error: assocError } = await supabase
          .from('quote_item_variants')
          .insert(itemVariantAssociations)

        if (assocError) throw assocError
      }
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

// PUT - update existing quote with variants
export async function PUT(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

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

    // Calculate total subtotal
    const subtotal = validatedData.items.reduce((sum, item) => sum + item.total_price, 0)

    // Update quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .update({
        customer_name: validatedData.customer_name,
        customer_email: validatedData.customer_email || null,
        customer_phone: validatedData.customer_phone || null,
        customer_address: validatedData.customer_address || null,
        pool_config: validatedData.pool_config,
        valid_until: validatedData.valid_until || null,
        delivery_term: validatedData.delivery_term || '4-8 týdnů',
        notes: validatedData.notes || null,
        subtotal,
        total_price: subtotal,
      })
      .eq('id', validatedData.id)

    if (quoteError) throw quoteError

    // Delete existing variants and items (cascade will handle associations)
    await supabase.from('quote_variants').delete().eq('quote_id', validatedData.id)
    await supabase.from('quote_items').delete().eq('quote_id', validatedData.id)

    // Re-create variants
    const variantIdMap: Record<QuoteVariantKey, string> = {} as Record<QuoteVariantKey, string>

    if (validatedData.variants && validatedData.variants.length > 0) {
      // Calculate subtotal for each variant
      const variantSubtotals: Record<QuoteVariantKey, number> = {
        ekonomicka: 0,
        optimalni: 0,
        premiova: 0,
      }

      validatedData.items.forEach((item) => {
        (item.variant_keys || []).forEach((key) => {
          variantSubtotals[key] += item.total_price
        })
      })

      const variantsToInsert = validatedData.variants.map((v, idx) => {
        const variantSubtotal = variantSubtotals[v.variant_key]
        const discountPercent = v.discount_percent || 0
        const discountAmount = v.discount_amount || 0
        const totalAfterDiscount = variantSubtotal - (variantSubtotal * discountPercent / 100) - discountAmount

        return {
          quote_id: validatedData.id,
          variant_key: v.variant_key,
          variant_name: v.variant_name,
          sort_order: v.sort_order ?? idx,
          subtotal: variantSubtotal,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          total_price: Math.max(0, totalAfterDiscount),
        }
      })

      const { data: insertedVariants, error: variantsError } = await supabase
        .from('quote_variants')
        .insert(variantsToInsert)
        .select('id, variant_key')

      if (variantsError) throw variantsError

      insertedVariants?.forEach((v) => {
        variantIdMap[v.variant_key as QuoteVariantKey] = v.id
      })
    }

    // Re-create items
    if (validatedData.items.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabase
        .from('quote_items')
        .insert(
          validatedData.items.map((item) => ({
            quote_id: validatedData.id,
            product_id: item.product_id,
            name: item.name,
            description: item.description || null,
            category: normalizeCategory(item.category), // Map legacy categories
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price,
            sort_order: item.sort_order,
          }))
        )
        .select('id')

      if (itemsError) throw itemsError

      // Create item-variant associations
      const itemVariantAssociations: { quote_item_id: string; quote_variant_id: string }[] = []

      validatedData.items.forEach((item, idx) => {
        const insertedItemId = insertedItems?.[idx]?.id
        if (insertedItemId && item.variant_keys) {
          item.variant_keys.forEach((variantKey) => {
            const variantId = variantIdMap[variantKey]
            if (variantId) {
              itemVariantAssociations.push({
                quote_item_id: insertedItemId,
                quote_variant_id: variantId,
              })
            }
          })
        }
      })

      if (itemVariantAssociations.length > 0) {
        const { error: assocError } = await supabase
          .from('quote_item_variants')
          .insert(itemVariantAssociations)

        if (assocError) throw assocError
      }
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
