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

    const { error } = await supabase
      .from('configurations')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Error bulk deleting configurations:', error)
      return NextResponse.json({ error: 'Nepodařilo se smazat konfigurace' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Bulk delete configurations error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
