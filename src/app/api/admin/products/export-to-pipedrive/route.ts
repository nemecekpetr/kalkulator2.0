import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import type { Product } from '@/lib/supabase/types'

const PIPEDRIVE_API_URL = 'https://api.pipedrive.com/v1'

// Reverse mapping: our category -> Pipedrive category ID
const CATEGORY_TO_PIPEDRIVE: Record<string, string> = {
  bazeny: '102',
  zastreseni: '108',
  sluzby: '109',
  doprava: '110',
  prislusenstvi: '111',
  schodiste: '113',
  uprava_vody: '114',
  protiproud: '115',
  technologie: '116',
  material: '117',
  ohrev: '118',
  osvetleni: '119',
  cisteni: '120',
  chemie: '121',
  jine: '122',
  sety: '137',
}

interface PipedriveProductPayload {
  name: string
  code?: string
  description?: string
  unit?: string
  prices?: Array<{
    price: number
    currency: string
  }>
  category?: string
  active_flag?: boolean
}

async function pipedriveRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN
  if (!apiToken) {
    return { success: false, error: 'PIPEDRIVE_API_TOKEN není nakonfigurován' }
  }

  const url = new URL(`${PIPEDRIVE_API_URL}${endpoint}`)
  url.searchParams.set('api_token', apiToken)

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Neznámá chyba',
    }
  }
}

function productToPipedrive(product: Product): PipedriveProductPayload {
  return {
    name: product.name,
    code: product.code || undefined,
    description: product.description || undefined,
    unit: product.unit || 'ks',
    prices: [
      {
        price: product.unit_price,
        currency: 'CZK',
      },
    ],
    category: CATEGORY_TO_PIPEDRIVE[product.category] || CATEGORY_TO_PIPEDRIVE.jine,
    active_flag: product.active,
  }
}

/**
 * POST /api/admin/products/export-to-pipedrive
 * Export products from our app to Pipedrive
 */
export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    // Check if Pipedrive is configured
    if (!process.env.PIPEDRIVE_API_TOKEN) {
      return NextResponse.json({ error: 'Pipedrive API není nakonfigurováno' }, { status: 400 })
    }

    // Get products to export
    let query = supabase.from('products').select('*')

    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      // Export specific products
      query = query.in('id', body.ids)
    } else if (body.active_only !== false) {
      // Export all active products by default
      query = query.eq('active', true)
    }

    const { data: products, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching products:', fetchError)
      return NextResponse.json({ error: 'Chyba při načítání produktů' }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Žádné produkty k exportu',
        stats: { created: 0, updated: 0, failed: 0, total: 0 },
      })
    }

    // Export each product
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as { id: string; name: string; error: string }[],
    }

    for (const product of products as Product[]) {
      const payload = productToPipedrive(product)

      if (product.pipedrive_id) {
        // Update existing product in Pipedrive
        const result = await pipedriveRequest(`/products/${product.pipedrive_id}`, 'PUT', payload)

        if (result.success) {
          results.updated++
          // Update sync timestamp
          await supabase
            .from('products')
            .update({ pipedrive_synced_at: new Date().toISOString() })
            .eq('id', product.id)
        } else {
          results.failed++
          results.errors.push({
            id: product.id,
            name: product.name,
            error: result.error || 'Neznámá chyba',
          })
        }
      } else {
        // Create new product in Pipedrive
        const result = await pipedriveRequest<{ id: number }>('/products', 'POST', payload)

        if (result.success && result.data?.id) {
          results.created++
          // Save Pipedrive ID and sync timestamp
          await supabase
            .from('products')
            .update({
              pipedrive_id: result.data.id,
              pipedrive_synced_at: new Date().toISOString(),
            })
            .eq('id', product.id)
        } else {
          results.failed++
          results.errors.push({
            id: product.id,
            name: product.name,
            error: result.error || 'Neznámá chyba',
          })
        }
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      message: `Export dokončen: ${results.created} vytvořeno, ${results.updated} aktualizováno, ${results.failed} chyb`,
      stats: {
        created: results.created,
        updated: results.updated,
        failed: results.failed,
        total: products.length,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error('Export to Pipedrive error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/products/export-to-pipedrive
 * Get export status
 */
export async function GET() {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const supabase = await createAdminClient()

    // Count products by sync status
    const { data: synced } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .not('pipedrive_id', 'is', null)

    const { data: notSynced } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .is('pipedrive_id', null)
      .eq('active', true)

    // Get last sync time
    const { data: lastSync } = await supabase
      .from('products')
      .select('pipedrive_synced_at')
      .not('pipedrive_synced_at', 'is', null)
      .order('pipedrive_synced_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      synced_count: synced?.length || 0,
      not_synced_count: notSynced?.length || 0,
      last_sync: lastSync?.[0]?.pipedrive_synced_at || null,
      pipedrive_configured: !!process.env.PIPEDRIVE_API_TOKEN,
    })
  } catch (error) {
    console.error('Export status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chyba serveru' },
      { status: 500 }
    )
  }
}
