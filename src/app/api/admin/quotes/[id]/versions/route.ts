import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { QuoteVersion, Quote, QuoteItem } from '@/lib/supabase/types'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - list all versions for a quote
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data: versions, error } = await supabase
      .from('quote_versions')
      .select('*')
      .eq('quote_id', id)
      .order('version_number', { ascending: false })

    if (error) throw error

    return NextResponse.json(versions as QuoteVersion[])
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání verzí' },
      { status: 500 }
    )
  }
}

// POST - create a new version (snapshot current state)
export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const { id } = await params
    const body = await request.json()
    const { notes } = body as { notes?: string }

    const supabase = await createAdminClient()

    // Fetch current quote with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Nabídka nenalezena' },
        { status: 404 }
      )
    }

    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    if (itemsError) throw itemsError

    // Get current highest version number
    const { data: latestVersion } = await supabase
      .from('quote_versions')
      .select('version_number')
      .eq('quote_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1

    // Create snapshot
    const snapshot = {
      quote: quote as Quote,
      items: (items || []) as QuoteItem[],
      created_at: new Date().toISOString(),
    }

    // Insert new version
    const { data: version, error: versionError } = await supabase
      .from('quote_versions')
      .insert({
        quote_id: id,
        version_number: nextVersionNumber,
        snapshot,
        notes: notes || `Verze ${nextVersionNumber}`,
      })
      .select()
      .single()

    if (versionError) throw versionError

    return NextResponse.json({
      success: true,
      version: version as QuoteVersion,
    })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json(
      { error: 'Chyba při vytváření verze' },
      { status: 500 }
    )
  }
}
