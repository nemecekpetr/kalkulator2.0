import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/products/bulk-delete
 * Bulk delete products by IDs
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

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

    // Parse request body
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No product IDs provided' },
        { status: 400 }
      )
    }

    // Delete products
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Error deleting products:', error)
      return NextResponse.json(
        { error: 'Failed to delete products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    })
  } catch (error) {
    console.error('Error in bulk delete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
