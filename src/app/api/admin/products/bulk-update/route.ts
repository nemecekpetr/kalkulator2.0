import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/products/bulk-update
 * Bulk update products (category, active status, code, unit_price)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { ids, updates } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No product IDs provided' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    // Build update object with only allowed fields
    const allowedFields = ['category', 'active', 'code', 'unit_price']
    const sanitizedUpdates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in updates) {
        sanitizedUpdates[field] = updates[field]
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // Update products using admin client (bypasses RLS and has proper types)
    const { data, error } = await adminClient
      .from('products')
      .update(sanitizedUpdates)
      .in('id', ids)
      .select()

    if (error) {
      console.error('Error updating products:', error)
      return NextResponse.json(
        { error: 'Failed to update products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    })
  } catch (error) {
    console.error('Error in bulk update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
