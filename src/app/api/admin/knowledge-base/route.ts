import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AssistantKnowledgeInsert } from '@/lib/supabase/types'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/knowledge-base
 * List all knowledge base entries
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = (await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const sourceType = searchParams.get('source_type')
    const activeOnly = searchParams.get('active') !== 'false'
    const search = searchParams.get('search')

    const adminClient = await createAdminClient()
    let query = adminClient
      .from('assistant_knowledge')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('active', true)
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType)
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%,source_url.ilike.%${search}%`
      )
    }

    const { data, error } = await query.limit(100)

    if (error) {
      console.error('Error fetching knowledge:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [], count: data?.length || 0 })
  } catch (error) {
    console.error('Knowledge base GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/knowledge-base
 * Create a new knowledge base entry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = (await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: { role: string } | null }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { source_url, source_type, title, content, keywords } = body

    if (!source_url || !source_type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: source_url, source_type, content' },
        { status: 400 }
      )
    }

    // Generate content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16)

    const insertData: AssistantKnowledgeInsert = {
      source_url,
      source_type,
      title: title || null,
      content,
      content_hash: contentHash,
      keywords: keywords || null,
      active: true,
    }

    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('assistant_knowledge')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating knowledge:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error) {
    console.error('Knowledge base POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
