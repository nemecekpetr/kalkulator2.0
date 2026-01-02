import { NextResponse } from 'next/server'
import { generateQuoteItemsFromConfiguration } from '@/lib/quote-generator'
import type { Configuration } from '@/lib/supabase/types'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/quotes/generate-items
 * Generate quote items from a configuration
 */
export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error
  const { supabase } = authResult

  try {
    const body = await request.json()
    const { configurationId } = body

    if (!configurationId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      )
    }

    // Fetch the configuration
    const { data: configData, error: configError } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', configurationId)
      .single()

    if (configError || !configData) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    const config = configData as Configuration

    // Generate quote items
    const items = await generateQuoteItemsFromConfiguration(config, supabase)

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)

    return NextResponse.json({
      success: true,
      items,
      subtotal,
      configuration: {
        id: config.id,
        pool_shape: config.pool_shape,
        pool_type: config.pool_type,
        dimensions: config.dimensions,
        color: config.color,
        stairs: config.stairs,
        technology: config.technology,
        lighting: config.lighting,
        counterflow: config.counterflow,
        water_treatment: config.water_treatment,
        heating: config.heating,
        roofing: config.roofing,
        contact_name: config.contact_name,
        contact_email: config.contact_email,
        contact_phone: config.contact_phone,
        contact_address: config.contact_address,
      },
    })
  } catch (error) {
    console.error('Error generating quote items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
