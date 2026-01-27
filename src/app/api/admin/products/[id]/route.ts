import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { ProductUpdate } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/products/[id]
 * Get a single product by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Produkt nenalezen' }, { status: 404 })
      }
      console.error('Error fetching product:', error)
      return NextResponse.json({ error: 'Chyba při načítání produktu' }, { status: 500 })
    }

    return NextResponse.json({ product: data })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/products/[id]
 * Update a product
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const body = await request.json()

    // Validate price_type specific fields
    if (body.price_type === 'percentage') {
      if (body.price_reference_product_id === null && body.price_percentage !== undefined) {
        return NextResponse.json(
          { error: 'Pro procentuální cenu je nutný referenční produkt' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: ProductUpdate = {}

    // Basic fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.code !== undefined) updateData.code = body.code
    if (body.old_code !== undefined) updateData.old_code = body.old_code
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.subcategory !== undefined) updateData.subcategory = body.subcategory
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer
    if (body.unit_price !== undefined) updateData.unit_price = body.unit_price
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.active !== undefined) updateData.active = body.active

    // Pricing fields
    if (body.price_type !== undefined) updateData.price_type = body.price_type
    if (body.price_reference_product_id !== undefined)
      updateData.price_reference_product_id = body.price_reference_product_id
    if (body.price_percentage !== undefined) updateData.price_percentage = body.price_percentage
    if (body.price_minimum !== undefined) updateData.price_minimum = body.price_minimum
    if (body.price_coefficient !== undefined) updateData.price_coefficient = body.price_coefficient
    if (body.coefficient_unit !== undefined) updateData.coefficient_unit = body.coefficient_unit
    if (body.required_surcharge_ids !== undefined)
      updateData.required_surcharge_ids = body.required_surcharge_ids
    if (body.tags !== undefined) updateData.tags = body.tags

    // Pipedrive fields (if syncing)
    if (body.pipedrive_id !== undefined) updateData.pipedrive_id = body.pipedrive_id
    if (body.pipedrive_synced_at !== undefined)
      updateData.pipedrive_synced_at = body.pipedrive_synced_at

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Produkt nenalezen' }, { status: 404 })
      }
      console.error('Error updating product:', error)
      return NextResponse.json(
        { error: `Chyba při aktualizaci produktu: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: data })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/products/[id]
 * Delete a product (soft delete by setting active=false, or hard delete)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get('hard') === 'true'

    if (hard) {
      // Hard delete
      const { error } = await supabase.from('products').delete().eq('id', id)

      if (error) {
        console.error('Error deleting product:', error)
        return NextResponse.json(
          { error: `Chyba při mazání produktu: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      // Soft delete
      const { error } = await supabase.from('products').update({ active: false }).eq('id', id)

      if (error) {
        console.error('Error deactivating product:', error)
        return NextResponse.json(
          { error: `Chyba při deaktivaci produktu: ${error.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}
