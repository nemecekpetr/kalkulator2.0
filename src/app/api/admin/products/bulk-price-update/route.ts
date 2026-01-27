import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import type { Product } from '@/lib/supabase/types'

interface BulkPriceUpdateRequest {
  /** Product IDs to update */
  ids: string[]
  /** Type of update */
  update_type: 'percentage' | 'fixed'
  /** Percentage change (e.g., 5 for +5%, -5 for -5%) */
  percentage_change?: number
  /** Fixed amount change (e.g., 1000 for +1000, -500 for -500) */
  fixed_change?: number
  /** Reason for the change (for history) */
  reason?: string
}

/**
 * POST /api/admin/products/bulk-price-update
 * Bulk update product prices by percentage or fixed amount
 */
export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const body: BulkPriceUpdateRequest = await request.json()
    const { user } = authResult

    // Validate request
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'Nebyla vybrána žádná ID produktů' }, { status: 400 })
    }

    if (!body.update_type || !['percentage', 'fixed'].includes(body.update_type)) {
      return NextResponse.json(
        { error: 'Neplatný typ aktualizace (percentage nebo fixed)' },
        { status: 400 }
      )
    }

    if (body.update_type === 'percentage' && typeof body.percentage_change !== 'number') {
      return NextResponse.json({ error: 'Chybí procentuální změna' }, { status: 400 })
    }

    if (body.update_type === 'fixed' && typeof body.fixed_change !== 'number') {
      return NextResponse.json({ error: 'Chybí fixní částka změny' }, { status: 400 })
    }

    // Fetch current products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, unit_price, price_version')
      .in('id', body.ids)

    if (fetchError) {
      console.error('Error fetching products:', fetchError)
      return NextResponse.json({ error: 'Chyba při načítání produktů' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Žádné produkty nenalezeny' }, { status: 404 })
    }

    // Calculate new prices
    const updates: { id: string; old_price: number; new_price: number }[] = []

    for (const product of products as Product[]) {
      let newPrice: number

      if (body.update_type === 'percentage') {
        const multiplier = 1 + (body.percentage_change || 0) / 100
        newPrice = Math.round(product.unit_price * multiplier)
      } else {
        newPrice = product.unit_price + (body.fixed_change || 0)
      }

      // Ensure price is not negative
      newPrice = Math.max(0, newPrice)

      updates.push({
        id: product.id,
        old_price: product.unit_price,
        new_price: newPrice,
      })
    }

    // Update products one by one to trigger price history
    // (The trigger will handle incrementing price_version and creating history)
    const updateResults = await Promise.all(
      updates.map(async (update) => {
        const { error } = await supabase
          .from('products')
          .update({ unit_price: update.new_price })
          .eq('id', update.id)

        return { id: update.id, success: !error, error }
      })
    )

    // Add reason to price history if provided
    if (body.reason) {
      const historyUpdates = updates.map((update) => ({
        product_id: update.id,
        reason: body.reason,
        changed_by: user?.id || null,
      }))

      // Update the most recent history entries with the reason
      for (const historyUpdate of historyUpdates) {
        await supabase
          .from('product_price_history')
          .update({ reason: historyUpdate.reason, changed_by: historyUpdate.changed_by })
          .eq('product_id', historyUpdate.product_id)
          .order('created_at', { ascending: false })
          .limit(1)
      }
    }

    const successCount = updateResults.filter((r) => r.success).length
    const failCount = updateResults.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failCount,
      updates: updates.map((u) => ({
        id: u.id,
        old_price: u.old_price,
        new_price: u.new_price,
        change:
          body.update_type === 'percentage'
            ? `${body.percentage_change}%`
            : `${body.fixed_change! >= 0 ? '+' : ''}${body.fixed_change} Kč`,
      })),
    })
  } catch (error) {
    console.error('Bulk price update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/products/bulk-price-update/preview
 * Preview price changes before applying
 */
export async function GET(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const ids = searchParams.get('ids')?.split(',') || []
    const updateType = searchParams.get('update_type') as 'percentage' | 'fixed'
    const percentageChange = parseFloat(searchParams.get('percentage_change') || '0')
    const fixedChange = parseFloat(searchParams.get('fixed_change') || '0')

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Chybí ID produktů' }, { status: 400 })
    }

    // Fetch current products
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, code, unit_price, category')
      .in('id', ids)
      .order('name')

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Chyba při načítání produktů' }, { status: 500 })
    }

    // Calculate preview
    interface ProductPreview {
      id: string
      name: string
      code: string | null
      unit_price: number
      category: string
    }
    const preview = (products as ProductPreview[] || []).map((product) => {
      let newPrice: number

      if (updateType === 'percentage') {
        const multiplier = 1 + percentageChange / 100
        newPrice = Math.round(product.unit_price * multiplier)
      } else {
        newPrice = product.unit_price + fixedChange
      }

      newPrice = Math.max(0, newPrice)

      return {
        id: product.id,
        name: product.name,
        code: product.code,
        category: product.category,
        old_price: product.unit_price,
        new_price: newPrice,
        difference: newPrice - product.unit_price,
        percentage_change:
          product.unit_price > 0
            ? Math.round(((newPrice - product.unit_price) / product.unit_price) * 100 * 100) / 100
            : 0,
      }
    })

    return NextResponse.json({
      preview,
      total_old: preview.reduce((sum, p) => sum + p.old_price, 0),
      total_new: preview.reduce((sum, p) => sum + p.new_price, 0),
      total_difference: preview.reduce((sum, p) => sum + p.difference, 0),
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}
