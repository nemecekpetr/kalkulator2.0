import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPipedriveClient, mapPipedriveProduct } from '@/lib/pipedrive/client'
import type { ProductCategory } from '@/lib/supabase/types'

// Map Pipedrive category to our categories
function mapCategory(pipedriveCategory: string | null): ProductCategory {
  if (!pipedriveCategory) return 'prislusenstvi'

  const categoryLower = pipedriveCategory.toLowerCase()

  if (categoryLower.includes('bazén') || categoryLower.includes('bazen') || categoryLower.includes('pool')) {
    return 'bazeny'
  }

  if (categoryLower.includes('služ') || categoryLower.includes('sluz') || categoryLower.includes('práce') || categoryLower.includes('prace') || categoryLower.includes('montáž') || categoryLower.includes('montaz')) {
    return 'sluzby'
  }

  return 'prislusenstvi'
}

export async function POST(request: Request) {
  try {
    // Check for authorization (simple API key or session check)
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.ADMIN_API_KEY

    // If ADMIN_API_KEY is set, validate it
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Neautorizovaný přístup' },
        { status: 401 }
      )
    }

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

    let created = 0
    let updated = 0

    for (const pProduct of pipedriveProducts) {
      const mappedProduct = mapPipedriveProduct(pProduct)

      // Check if product already exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('pipedrive_id', pProduct.id)
        .single()

      if (existing) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            ...mappedProduct,
            category: mapCategory(pProduct.category),
          })
          .eq('id', existing.id)

        if (!error) updated++
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert({
            ...mappedProduct,
            category: mapCategory(pProduct.category),
          })

        if (!error) created++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronizace dokončena`,
      stats: {
        created,
        updated,
        total: pipedriveProducts.length
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
