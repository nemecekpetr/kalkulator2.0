import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { ProductGroupUpdate } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/product-groups/[id]
 * Get a single product group with its items
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('product_groups')
      .select(
        `
        *,
        items:product_group_items(
          *,
          product:products(*)
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Skupina nenalezena' }, { status: 404 })
      }
      console.error('Error fetching product group:', error)
      return NextResponse.json({ error: 'Chyba při načítání skupiny' }, { status: 500 })
    }

    // Sort items
    const group = {
      ...data,
      items: (data.items || []).sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      ),
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Get product group error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/product-groups/[id]
 * Update a product group and its items
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const body = await request.json()

    // Build update object for the group
    const updateData: ProductGroupUpdate = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.active !== undefined) updateData.active = body.active

    // Update group if there are changes
    if (Object.keys(updateData).length > 0) {
      const { error: groupError } = await supabase
        .from('product_groups')
        .update(updateData)
        .eq('id', id)

      if (groupError) {
        console.error('Error updating product group:', groupError)
        return NextResponse.json(
          { error: `Chyba při aktualizaci skupiny: ${groupError.message}` },
          { status: 500 }
        )
      }
    }

    // Update items if provided
    if (body.items !== undefined && Array.isArray(body.items)) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('product_group_items')
        .delete()
        .eq('group_id', id)

      if (deleteError) {
        console.error('Error deleting existing items:', deleteError)
        return NextResponse.json(
          { error: `Chyba při aktualizaci položek: ${deleteError.message}` },
          { status: 500 }
        )
      }

      // Insert new items
      if (body.items.length > 0) {
        const itemsToInsert = body.items.map(
          (item: { product_id: string; quantity?: number }, index: number) => ({
            group_id: id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
            sort_order: index,
          })
        )

        const { error: insertError } = await supabase
          .from('product_group_items')
          .insert(itemsToInsert)

        if (insertError) {
          console.error('Error inserting new items:', insertError)
          return NextResponse.json(
            { error: `Chyba při přidávání položek: ${insertError.message}` },
            { status: 500 }
          )
        }
      }
    }

    // Fetch the updated group with items
    const { data: updatedGroup, error: fetchError } = await supabase
      .from('product_groups')
      .select(
        `
        *,
        items:product_group_items(
          *,
          product:products(*)
        )
      `
      )
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Skupina nenalezena' }, { status: 404 })
    }

    return NextResponse.json({ group: updatedGroup })
  } catch (error) {
    console.error('Update product group error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/product-groups/[id]
 * Delete a product group
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Items are deleted automatically via CASCADE
    const { error } = await supabase.from('product_groups').delete().eq('id', id)

    if (error) {
      console.error('Error deleting product group:', error)
      return NextResponse.json(
        { error: `Chyba při mazání skupiny: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product group error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}
