import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Check if quote exists and get status
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Nabídka nenalezena' }, { status: 404 })
    }

    // Block deleting accepted quotes (they have dependent orders)
    if (quote.status === 'accepted') {
      return NextResponse.json(
        { error: 'Nelze smazat akceptovanou nabídku — existuje k ní objednávka' },
        { status: 400 }
      )
    }

    // Delete quote (items, variants, item_variants cascade via FK)
    const { error: deleteError } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting quote:', deleteError)
      return NextResponse.json({ error: 'Nepodařilo se smazat nabídku' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Quote delete error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
