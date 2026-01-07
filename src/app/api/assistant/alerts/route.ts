import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AssistantAlert, AssistantAlertUpdate } from '@/lib/supabase/types'

/**
 * GET /api/assistant/alerts
 * Get unread alerts for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Type assertion needed because table may not exist in generated types yet
    const { data: alerts, error } = (await supabase
      .from('assistant_alerts')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .is('dismissed_at', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)) as { data: AssistantAlert[] | null; error: unknown }

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      )
    }

    // Count unread
    const unreadCount = alerts?.filter((a) => !a.is_read).length || 0

    return NextResponse.json({
      alerts: alerts || [],
      unread_count: unreadCount,
    })
  } catch (error) {
    console.error('Alerts GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/assistant/alerts
 * Mark alerts as read or dismissed
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alert_ids, action } = body as {
      alert_ids: string[]
      action: 'read' | 'dismiss' | 'dismiss_all'
    }

    if (action === 'dismiss_all') {
      // Dismiss all alerts for user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = (await (supabase as any)
        .from('assistant_alerts')
        .update({ dismissed_at: new Date().toISOString() })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .is('dismissed_at', null)) as { error: unknown }

      if (error) {
        return NextResponse.json(
          { error: 'Failed to dismiss alerts' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, action: 'dismiss_all' })
    }

    if (!alert_ids || alert_ids.length === 0) {
      return NextResponse.json(
        { error: 'alert_ids required' },
        { status: 400 }
      )
    }

    const updates: AssistantAlertUpdate = {}

    if (action === 'read') {
      updates.is_read = true
      updates.read_at = new Date().toISOString()
    } else if (action === 'dismiss') {
      updates.dismissed_at = new Date().toISOString()
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = (await (supabase as any)
      .from('assistant_alerts')
      .update(updates)
      .in('id', alert_ids)
      .or(`user_id.eq.${user.id},user_id.is.null`)) as { error: unknown }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update alerts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, action, count: alert_ids.length })
  } catch (error) {
    console.error('Alerts PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
