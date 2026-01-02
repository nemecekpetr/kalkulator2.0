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
