import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client inside the function to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface CallbackPayload {
  configurationId: string
  success: boolean
  dealId?: string
  error?: string
  secret?: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: CallbackPayload = await request.json()

    // Fail-closed: Always require secret in production
    const MAKE_CALLBACK_SECRET = process.env.MAKE_CALLBACK_SECRET
    if (!MAKE_CALLBACK_SECRET) {
      console.error('CRITICAL: MAKE_CALLBACK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      )
    }

    // Verify callback secret
    if (payload.secret !== MAKE_CALLBACK_SECRET) {
      console.warn('Invalid webhook secret attempt', {
        ip: request.headers.get('x-forwarded-for'),
        configurationId: payload.configurationId,
      })
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      )
    }

    const { configurationId, success, dealId, error } = payload

    if (!configurationId) {
      return NextResponse.json(
        { error: 'Missing configurationId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Update configuration status
    const { error: updateError } = await supabase
      .from('configurations')
      .update({
        pipedrive_status: success ? 'success' : 'error',
        pipedrive_deal_id: dealId || null,
        pipedrive_error: error || null,
        pipedrive_synced_at: success ? new Date().toISOString() : null,
      })
      .eq('id', configurationId)

    if (updateError) {
      console.error('Failed to update configuration:', updateError)
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    // Log the callback
    await supabase.from('sync_log').insert({
      configuration_id: configurationId,
      action: 'pipedrive_callback',
      status: success ? 'success' : 'error',
      response: { dealId, error },
      error_message: error || null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Webhook callback error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
