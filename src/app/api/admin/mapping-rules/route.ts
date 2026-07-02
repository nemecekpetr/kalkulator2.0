import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'

/**
 * PUT /api/admin/mapping-rules
 * Update a product mapping rule
 */
export async function PUT(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const body = await request.json()
    const { id, product_id, quantity, active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()

    // Update the rule
    const { data, error } = await adminClient
      .from('product_mapping_rules')
      .update({
        product_id: product_id || null,
        quantity: quantity || 1,
        active: active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, product:products(*)')
      .single()

    if (error) {
      console.error('Error updating mapping rule:', error)
      return NextResponse.json(
        { error: 'Failed to update rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, rule: data })
  } catch (error) {
    console.error('Error in mapping rules API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/mapping-rules
 * Create an additional product mapping rule for a configurator choice.
 * Multiple rules may share the same (config_field, config_value) — the quote
 * generator applies every matching rule, so several products get added.
 */
export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const body = await request.json()
    const {
      name,
      config_field,
      config_value,
      product_id,
      quantity,
      pool_shape,
      pool_type,
      sort_order,
    } = body

    if (!config_field || !config_value) {
      return NextResponse.json(
        { error: 'config_field and config_value are required' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('product_mapping_rules')
      .insert({
        name: name || `${config_field} – ${config_value}`,
        config_field,
        config_value,
        product_id: product_id || null,
        quantity: quantity || 1,
        pool_shape: pool_shape ?? null,
        pool_type: pool_type ?? null,
        sort_order: sort_order ?? 0,
        active: true,
      })
      .select('*, product:products(*)')
      .single()

    if (error) {
      console.error('Error creating mapping rule:', error)
      return NextResponse.json(
        { error: 'Failed to create rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, rule: data })
  } catch (error) {
    console.error('Error in mapping rules API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/mapping-rules
 * Remove a product mapping rule (used to detach an extra product from a choice).
 */
export async function DELETE(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('product_mapping_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting mapping rule:', error)
      return NextResponse.json(
        { error: 'Failed to delete rule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in mapping rules API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/mapping-rules
 * Get all product mapping rules
 */
export async function GET() {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createClient()

    const { data, error } = await (supabase
      .from('product_mapping_rules') as ReturnType<typeof supabase.from>)
      .select('*, product:products(*)')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching mapping rules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rules' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rules: data })
  } catch (error) {
    console.error('Error in mapping rules API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
