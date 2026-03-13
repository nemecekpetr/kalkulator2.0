import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Žádná ID nebyla poskytnuta' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Check for accepted quotes (cannot be deleted)
    const { data: acceptedQuotes } = await supabase
      .from('quotes')
      .select('id')
      .in('id', ids)
      .eq('status', 'accepted')

    if (acceptedQuotes && acceptedQuotes.length > 0) {
      return NextResponse.json(
        { error: `Nelze smazat ${acceptedQuotes.length} akceptovaných nabídek — mají závislé objednávky` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Error bulk deleting quotes:', error)
      return NextResponse.json({ error: 'Nepodařilo se smazat nabídky' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Bulk delete quotes error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
