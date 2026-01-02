import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Quote, QuoteItem } from '@/lib/supabase/types'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

// POST - restore a quote to a specific version
export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id, versionId } = await params
    const supabase = await createAdminClient()

    // Fetch the version to restore
    const { data: version, error: versionError } = await supabase
      .from('quote_versions')
      .select('*')
      .eq('id', versionId)
      .eq('quote_id', id)
      .single()

    if (versionError || !version) {
      return NextResponse.json(
        { error: 'Verze nenalezena' },
        { status: 404 }
      )
    }

    const snapshot = version.snapshot as {
      quote: Quote
      items: QuoteItem[]
    }

    if (!snapshot || !snapshot.quote) {
      return NextResponse.json(
        { error: 'Neplatná verze - chybí data' },
        { status: 400 }
      )
    }

    // First, create a backup version of current state
    const { data: currentQuote } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    const { data: currentItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    // Get current highest version number for backup
    const { data: latestVersion } = await supabase
      .from('quote_versions')
      .select('version_number')
      .eq('quote_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const backupVersionNumber = (latestVersion?.version_number || 0) + 1

    // Create backup of current state before restoring
    await supabase.from('quote_versions').insert({
      quote_id: id,
      version_number: backupVersionNumber,
      snapshot: {
        quote: currentQuote,
        items: currentItems || [],
        created_at: new Date().toISOString(),
      },
      notes: `Záloha před obnovením verze ${version.version_number}`,
    })

    // Update quote with snapshot data
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        customer_name: snapshot.quote.customer_name,
        customer_email: snapshot.quote.customer_email,
        customer_phone: snapshot.quote.customer_phone,
        customer_address: snapshot.quote.customer_address,
        pool_config: snapshot.quote.pool_config,
        valid_until: snapshot.quote.valid_until,
        subtotal: snapshot.quote.subtotal,
        discount_percent: snapshot.quote.discount_percent,
        discount_amount: snapshot.quote.discount_amount,
        total_price: snapshot.quote.total_price,
        notes: snapshot.quote.notes,
        internal_notes: snapshot.quote.internal_notes,
        terms_and_conditions: snapshot.quote.terms_and_conditions,
      })
      .eq('id', id)

    if (updateError) throw updateError

    // Delete current items
    await supabase.from('quote_items').delete().eq('quote_id', id)

    // Restore items from snapshot
    if (snapshot.items && snapshot.items.length > 0) {
      const { error: itemsError } = await supabase.from('quote_items').insert(
        snapshot.items.map((item) => ({
          quote_id: id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: item.sort_order,
        }))
      )

      if (itemsError) throw itemsError
    }

    return NextResponse.json({
      success: true,
      message: `Nabídka obnovena na verzi ${version.version_number}`,
      backupVersion: backupVersionNumber,
    })
  } catch (error) {
    console.error('Error restoring version:', error)
    return NextResponse.json(
      { error: 'Chyba při obnovování verze' },
      { status: 500 }
    )
  }
}
