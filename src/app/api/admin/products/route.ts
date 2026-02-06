import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import type { ProductInsert } from '@/lib/supabase/types'

/**
 * GET /api/admin/products
 * List all products with optional filtering
 */
export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    // Build query
    let query = supabase.from('products').select('*')

    // Filter by category
    const category = searchParams.get('category')
    if (category) {
      query = query.eq('category', category)
    }

    // Filter by active status
    const active = searchParams.get('active')
    if (active !== null) {
      query = query.eq('active', active === 'true')
    }

    // Filter by price_type
    const priceType = searchParams.get('price_type')
    if (priceType) {
      query = query.eq('price_type', priceType)
    }

    // Filter by tags (contains any of)
    const tags = searchParams.get('tags')
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim())
      query = query.overlaps('tags', tagList)
    }

    // Search by name or code
    const search = searchParams.get('search')
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    // Sorting
    const sortBy = searchParams.get('sort_by') || 'name'
    const sortOrder = searchParams.get('sort_order') || 'asc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json({ error: 'Chyba při načítání produktů' }, { status: 500 })
    }

    return NextResponse.json({
      products: data || [],
      total: count,
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/products
 * Create a new product
 */
export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Název produktu je povinný' }, { status: 400 })
    }

    if (!body.category) {
      return NextResponse.json({ error: 'Kategorie je povinná' }, { status: 400 })
    }

    // Validate price_type specific fields
    if (body.price_type === 'percentage') {
      if (!body.price_reference_product_id) {
        return NextResponse.json(
          { error: 'Pro procentuální cenu je nutný referenční produkt' },
          { status: 400 }
        )
      }
      if (typeof body.price_percentage !== 'number' || body.price_percentage <= 0) {
        return NextResponse.json(
          { error: 'Pro procentuální cenu je nutné zadat procento' },
          { status: 400 }
        )
      }
    }

    if (body.price_type === 'coefficient') {
      if (typeof body.price_coefficient !== 'number' || body.price_coefficient <= 0) {
        return NextResponse.json(
          { error: 'Pro koeficient je nutné zadat hodnotu koeficientu' },
          { status: 400 }
        )
      }
    }

    // Prepare insert data
    const insertData: ProductInsert = {
      name: body.name,
      code: body.code || null,
      old_code: body.old_code || null,
      description: body.description || null,
      category: body.category,
      subcategory: body.subcategory || null,
      manufacturer: body.manufacturer || null,
      unit_price: body.unit_price || 0,
      unit: body.unit || 'ks',
      image_url: body.image_url || null,
      active: body.active !== false,
      // New pricing fields
      price_type: body.price_type || 'fixed',
      price_reference_product_id: body.price_reference_product_id || null,
      price_percentage: body.price_percentage || null,
      price_minimum: body.price_minimum || null,
      price_coefficient: body.price_coefficient || null,
      coefficient_unit: body.coefficient_unit || 'm2',
      required_surcharge_ids: body.required_surcharge_ids || null,
      tags: body.tags || null,
      set_addons: body.set_addons || null,
    }

    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { error: `Chyba při vytváření produktu: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}
