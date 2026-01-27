import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { ProductGroupInsert } from '@/lib/supabase/types'

/**
 * GET /api/admin/product-groups
 * List all product groups with their items
 */
export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    // Base query
    let query = supabase
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
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    // Filter by active
    const active = searchParams.get('active')
    if (active !== null) {
      query = query.eq('active', active === 'true')
    }

    // Filter by category
    const category = searchParams.get('category')
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching product groups:', error)
      return NextResponse.json({ error: 'Chyba při načítání skupin produktů' }, { status: 500 })
    }

    // Sort items within each group
    const groups = (data || []).map((group) => ({
      ...group,
      items: (group.items || []).sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      ),
    }))

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Product groups API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/product-groups
 * Create a new product group
 */
export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Název skupiny je povinný' }, { status: 400 })
    }

    // Prepare insert data
    const insertData: ProductGroupInsert = {
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      sort_order: body.sort_order || 0,
      active: body.active !== false,
    }

    const { data: group, error: groupError } = await supabase
      .from('product_groups')
      .insert(insertData)
      .select()
      .single()

    if (groupError) {
      console.error('Error creating product group:', groupError)
      return NextResponse.json(
        { error: `Chyba při vytváření skupiny: ${groupError.message}` },
        { status: 500 }
      )
    }

    // Add items if provided
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const itemsToInsert = body.items.map(
        (item: { product_id: string; quantity?: number }, index: number) => ({
          group_id: group.id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
          sort_order: index,
        })
      )

      const { error: itemsError } = await supabase.from('product_group_items').insert(itemsToInsert)

      if (itemsError) {
        console.error('Error adding items to group:', itemsError)
        // Group was created, but items failed - return partial success
        return NextResponse.json(
          {
            group,
            warning: `Skupina vytvořena, ale chyba při přidávání položek: ${itemsError.message}`,
          },
          { status: 201 }
        )
      }
    }

    // Fetch the complete group with items
    const { data: completeGroup } = await supabase
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
      .eq('id', group.id)
      .single()

    return NextResponse.json({ group: completeGroup || group }, { status: 201 })
  } catch (error) {
    console.error('Create product group error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}
