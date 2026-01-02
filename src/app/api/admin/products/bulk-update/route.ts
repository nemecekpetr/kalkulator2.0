import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/products/bulk-update
 * Bulk update products (category, active status, code, unit_price)
 */
export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const adminClient = await createAdminClient()

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
