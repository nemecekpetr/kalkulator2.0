import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPipedriveClient, mapPipedriveProduct } from '@/lib/pipedrive/client'
import type { ProductCategory } from '@/lib/supabase/types'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'

// Map Pipedrive category ID to our categories
// Updated 2026-01-27 - categories updated to match new schema
const PIPEDRIVE_CATEGORY_IDS: Record<string, ProductCategory> = {
  '102': 'skelety',        // Bazény → Skelety
  '108': 'jine',           // Zastřešení → Jiné (deprecated)
  '109': 'sluzby',         // Služby
  '110': 'doprava',        // Doprava
  '111': 'jine',           // Příslušenství → Jiné (deprecated)
  '113': 'schodiste',      // Schodiště
  '114': 'uprava_vody',    // Úprava vody
  '115': 'protiproud',     // Protiproud
  '116': 'technologie',    // Technologie
  '117': 'material',       // Materiál
  '118': 'ohrev',          // Ohřev
  '119': 'osvetleni',      // Osvětlení
  '120': 'vysavace',       // Čištění → Vysavače
  '121': 'chemie',         // Chemie
  '122': 'jine',           // Jiné
  '137': 'sety',           // Sety
}

function mapCategory(pipedriveCategory: string | null): ProductCategory {
  if (!pipedriveCategory) return 'jine'

  const categoryId = pipedriveCategory.trim()

  if (PIPEDRIVE_CATEGORY_IDS[categoryId]) {
    return PIPEDRIVE_CATEGORY_IDS[categoryId]
  }

  // Fallback for any new/unknown categories
  console.log('Unknown Pipedrive category ID:', categoryId)
  return 'jine'
}

export async function POST(request: Request) {
  // Check for API key auth first, then fall back to session auth
  const authHeader = request.headers.get('authorization')
  const expectedKey = process.env.ADMIN_API_KEY

  // If API key is provided, validate it
  if (authHeader) {
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Neautorizovaný přístup' },
        { status: 401 }
      )
    }
  } else {
    // No API key - require session auth
    const authResult = await requireAuth()
    if (isAuthError(authResult)) return authResult.error
  }

  try {

    // Check if Pipedrive is configured
    if (!process.env.PIPEDRIVE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Pipedrive API není nakonfigurováno' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const pipedrive = createPipedriveClient()

    // Fetch all products from Pipedrive
    const pipedriveProducts = await pipedrive.getAllProducts()

    if (!pipedriveProducts || pipedriveProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Žádné produkty k synchronizaci',
        stats: { created: 0, updated: 0, total: 0 }
      })
    }

    // Fetch existing products to determine creates vs updates
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, pipedrive_id')

    const existingByPipedriveId = new Map(
      (existingProducts || []).map(p => [p.pipedrive_id, p.id])
    )

    // Prepare products for upsert
    const productsToUpsert = pipedriveProducts.map(pProduct => {
      const mapped = mapPipedriveProduct(pProduct)
      const existingId = existingByPipedriveId.get(pProduct.id)

      return {
        // Include existing ID if updating, otherwise let DB generate
        ...(existingId ? { id: existingId } : {}),
        ...mapped,
        category: mapCategory(pProduct.category),
      }
    })

    // Count creates vs updates before upsert
    const updateCount = productsToUpsert.filter(p => 'id' in p).length
    const createCount = productsToUpsert.length - updateCount

    // Bulk upsert - single DB operation instead of N+1
    const { error: upsertError, data: upsertedData } = await supabase
      .from('products')
      .upsert(productsToUpsert, {
        onConflict: 'pipedrive_id',
        ignoreDuplicates: false
      })
      .select('id')

    if (upsertError) {
      console.error('Bulk upsert error:', upsertError)
      return NextResponse.json({
        success: false,
        error: `Chyba při ukládání: ${upsertError.message}`,
        stats: {
          created: 0,
          updated: 0,
          failed: pipedriveProducts.length,
          total: pipedriveProducts.length
        }
      }, { status: 500 })
    }

    const actualUpserted = upsertedData?.length || 0

    return NextResponse.json({
      success: true,
      message: `Synchronizace dokončena`,
      stats: {
        created: createCount,
        updated: updateCount,
        total: pipedriveProducts.length,
        synced: actualUpserted
      }
    })
  } catch (error) {
    console.error('Product sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba při synchronizaci' },
      { status: 500 }
    )
  }
}

// GET to check sync status / last sync time
export async function GET() {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()

    const { data: products, error } = await supabase
      .from('products')
      .select('pipedrive_synced_at')
      .order('pipedrive_synced_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const lastSync = products?.[0]?.pipedrive_synced_at || null

    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      lastSync,
      totalProducts: count || 0,
      pipedriveConfigured: !!process.env.PIPEDRIVE_API_TOKEN
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání stavu' },
      { status: 500 }
    )
  }
}
