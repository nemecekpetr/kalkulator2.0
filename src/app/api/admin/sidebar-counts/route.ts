import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createAdminClient()

    // Fetch counts in parallel - only items requiring attention
    const [
      configurationsResult,
      quotesResult,
      ordersResult,
      productionResult,
    ] = await Promise.all([
      // New configurations (not yet processed into quotes)
      supabase
        .from('configurations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new'),
      // Draft quotes (waiting to be sent)
      supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      // New orders (just created, need to be sent)
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'created'),
      // Pending production (waiting to start)
      supabase
        .from('production_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    return NextResponse.json({
      configurations: configurationsResult.count ?? 0,
      quotes: quotesResult.count ?? 0,
      orders: ordersResult.count ?? 0,
      production: productionResult.count ?? 0,
    })
  } catch (error) {
    console.error('Error fetching sidebar counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch counts' },
      { status: 500 }
    )
  }
}
