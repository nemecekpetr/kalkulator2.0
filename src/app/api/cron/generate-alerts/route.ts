import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AssistantAlertInsert } from '@/lib/supabase/types'

/**
 * POST /api/cron/generate-alerts
 * Cron job to generate proactive alerts
 * Should be called daily by Railway scheduler or Vercel Cron
 *
 * Secured by CRON_SECRET environment variable
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const alerts: AssistantAlertInsert[] = []
    const now = new Date()

    // =========================================================================
    // 1. Expiring quotes (within 3 days)
    // =========================================================================
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const { data: expiringQuotes } = await supabase
      .from('quotes')
      .select('id, quote_number, customer_name, valid_until')
      .eq('status', 'sent')
      .lte('valid_until', threeDaysFromNow.toISOString())
      .gte('valid_until', now.toISOString())

    for (const quote of expiringQuotes || []) {
      const daysLeft = Math.ceil(
        (new Date(quote.valid_until).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      alerts.push({
        alert_type: 'expiring_quote',
        priority: daysLeft <= 1 ? 'urgent' : 'high',
        entity_type: 'quote',
        entity_id: quote.id,
        title: `Nabídka ${quote.quote_number} brzy expiruje`,
        message: `Nabídka pro ${quote.customer_name} vyprší za ${daysLeft} ${daysLeft === 1 ? 'den' : 'dny'}. Zvažte kontaktovat zákazníka.`,
        action_url: `/admin/nabidky/${quote.id}`,
        metadata: { days_left: daysLeft },
      })
    }

    // =========================================================================
    // 2. Inactive quotes (sent but no response > 7 days)
    // =========================================================================
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: inactiveQuotes } = await supabase
      .from('quotes')
      .select('id, quote_number, customer_name, customer_email, sent_at')
      .eq('status', 'sent')
      .lte('sent_at', sevenDaysAgo.toISOString())

    for (const quote of inactiveQuotes || []) {
      const daysSinceSent = Math.floor(
        (now.getTime() - new Date(quote.sent_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      alerts.push({
        alert_type: 'inactive_quote',
        priority: daysSinceSent > 14 ? 'high' : 'normal',
        entity_type: 'quote',
        entity_id: quote.id,
        title: `Nabídka ${quote.quote_number} bez odpovědi`,
        message: `Nabídka pro ${quote.customer_name} byla odeslána před ${daysSinceSent} dny a zatím bez odpovědi.`,
        action_url: `/admin/nabidky/${quote.id}`,
        metadata: { days_since_sent: daysSinceSent, customer_email: quote.customer_email },
      })
    }

    // =========================================================================
    // 3. Production delays (past expected end date)
    // =========================================================================
    const { data: delayedProductions } = await supabase
      .from('production_orders')
      .select('id, production_number, order_id, production_end_date')
      .eq('status', 'in_progress')
      .lt('production_end_date', now.toISOString())

    for (const production of delayedProductions || []) {
      const daysDelayed = Math.floor(
        (now.getTime() - new Date(production.production_end_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      alerts.push({
        alert_type: 'production_delay',
        priority: daysDelayed > 7 ? 'urgent' : 'high',
        entity_type: 'production',
        entity_id: production.id,
        title: `Výroba ${production.production_number} je zpožděná`,
        message: `Výroba měla být dokončena před ${daysDelayed} dny.`,
        action_url: `/admin/vyroba/${production.id}`,
        metadata: { days_delayed: daysDelayed, order_id: production.order_id },
      })
    }

    // =========================================================================
    // 4. Products without price
    // =========================================================================
    const { data: productsWithoutPrice } = await supabase
      .from('products')
      .select('id, name, code')
      .eq('active', true)
      .or('unit_price.is.null,unit_price.eq.0')
      .limit(10)

    if (productsWithoutPrice && productsWithoutPrice.length > 0) {
      alerts.push({
        alert_type: 'missing_data',
        priority: 'normal',
        entity_type: 'product',
        title: `${productsWithoutPrice.length} produktů bez ceny`,
        message: `Některé aktivní produkty nemají nastavenou cenu: ${productsWithoutPrice.slice(0, 3).map(p => p.name).join(', ')}${productsWithoutPrice.length > 3 ? '...' : ''}`,
        action_url: '/admin/produkty',
        metadata: { product_ids: productsWithoutPrice.map(p => p.id) },
      })
    }

    // =========================================================================
    // Insert alerts (avoid duplicates by checking existing)
    // =========================================================================
    let insertedCount = 0

    for (const alert of alerts) {
      // Check if similar alert already exists (same type + entity)
      const { data: existing } = await supabase
        .from('assistant_alerts')
        .select('id')
        .eq('alert_type', alert.alert_type)
        .eq('entity_id', alert.entity_id || '')
        .is('dismissed_at', null)
        .limit(1)

      if (!existing || existing.length === 0) {
        const { error } = await supabase
          .from('assistant_alerts')
          .insert(alert)

        if (!error) {
          insertedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      generated: alerts.length,
      inserted: insertedCount,
      skipped: alerts.length - insertedCount,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Generate alerts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow GET for testing in browser (development only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return POST(request)
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
