import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/knowledge-base/import
 * Import knowledge from a URL by fetching and extracting content
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
    const { url, source_type = 'webpage' } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Rentmil-Knowledge-Importer/1.0',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      )
    }

    const html = await response.text()

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : url

    // Extract main content - simple extraction
    let content = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove header, footer, nav
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      // Convert common elements to text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()

    // Limit content length
    if (content.length > 50000) {
      content = content.slice(0, 50000) + '...'
    }

    // Generate content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16)

    // Check if content with same hash already exists
    const adminClient = await createAdminClient()
    const { data: existing } = await adminClient
      .from('assistant_knowledge')
      .select('id, source_url')
      .eq('content_hash', contentHash)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: 'Duplicate content',
          message: `Tento obsah již existuje (zdroj: ${existing.source_url})`,
          existingId: existing.id,
        },
        { status: 409 }
      )
    }

    // Insert new knowledge entry
    const { data, error } = await adminClient
      .from('assistant_knowledge')
      .insert({
        source_url: url,
        source_type,
        title,
        content,
        content_hash: contentHash,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error importing knowledge:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      item: data,
      extracted: {
        title,
        contentLength: content.length,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Knowledge base import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
