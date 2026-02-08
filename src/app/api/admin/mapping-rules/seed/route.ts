import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/mapping-rules/seed
 * Creates default mapping rules if they don't exist
 */
export async function POST() {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const adminClient = await createAdminClient()

    // Check if rules already exist
    const { count } = await adminClient
      .from('product_mapping_rules')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json({
        success: true,
        message: `Pravidla již existují (${count} pravidel)`,
        created: 0,
      })
    }

    // Default mapping rules
    const defaultRules = [
      // Technologie (Step 6)
      { name: 'Technologická šachta', config_field: 'technology', config_value: 'shaft', pool_shape: null, sort_order: 20 },
      { name: 'Technologická stěna', config_field: 'technology', config_value: 'wall', pool_shape: null, sort_order: 21 },
      { name: 'Jiné umístění technologie', config_field: 'technology', config_value: 'other', pool_shape: null, sort_order: 22 },

      // Osvětlení (Step 7 - Accessories)
      { name: 'LED osvětlení podvodní', config_field: 'lighting', config_value: 'led', pool_shape: null, sort_order: 30 },

      // Protiproud (Step 7 - Accessories)
      { name: 'Protiproud', config_field: 'counterflow', config_value: 'with_counterflow', pool_shape: null, sort_order: 40 },

      // Úprava vody (Step 7 - Accessories)
      { name: 'Chlorová úprava vody', config_field: 'waterTreatment', config_value: 'chlorine', pool_shape: null, sort_order: 50 },
      { name: 'Solná elektrolýza', config_field: 'waterTreatment', config_value: 'salt', pool_shape: null, sort_order: 51 },

      // Ohřev (Step 8)
      { name: 'Příprava odbočky pro ohřev', config_field: 'heating', config_value: 'preparation', pool_shape: null, sort_order: 60 },
      { name: 'Tepelné čerpadlo', config_field: 'heating', config_value: 'heat_pump', pool_shape: null, sort_order: 61 },

      // Zastřešení (Step 9)
      { name: 'Zastřešení bazénu', config_field: 'roofing', config_value: 'with_roofing', pool_shape: null, sort_order: 70 },
    ]

    // Insert rules
    const { data, error } = await adminClient
      .from('product_mapping_rules')
      .insert(defaultRules)
      .select()

    if (error) {
      console.error('Error creating mapping rules:', error)
      return NextResponse.json(
        { error: 'Failed to create rules: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Vytvořeno ${data.length} pravidel mapování`,
      created: data.length,
      rules: data,
    })
  } catch (error) {
    console.error('Error in seed mapping rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
