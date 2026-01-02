import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/mapping-rules/auto-assign
 * Automatically assign products to mapping rules based on matching names
 */
export async function POST() {
  const authResult = await requireAdmin()
  if (isAuthError(authResult)) return authResult.error

  try {
    const adminClient = await createAdminClient()

    // Get all mapping rules
    const { data: rules, error: rulesError } = await adminClient
      .from('product_mapping_rules')
      .select('*')

    if (rulesError) {
      console.error('Error fetching rules:', rulesError)
      return NextResponse.json(
        { error: 'Failed to fetch rules' },
        { status: 500 }
      )
    }

    // Get all products
    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select('*')
      .eq('active', true)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Create a map of product names to IDs (case-insensitive, trimmed)
    const productMap = new Map<string, string>()
    for (const product of products || []) {
      const normalizedName = product.name.toLowerCase().trim()
      productMap.set(normalizedName, product.id)
    }

    // Match rules to products
    const updates: { id: string; product_id: string; name: string }[] = []
    const notFound: string[] = []

    for (const rule of rules || []) {
      if (rule.product_id) {
        // Already assigned, skip
        continue
      }

      const normalizedRuleName = rule.name.toLowerCase().trim()
      const productId = productMap.get(normalizedRuleName)

      if (productId) {
        updates.push({
          id: rule.id,
          product_id: productId,
          name: rule.name,
        })
      } else {
        notFound.push(rule.name)
      }
    }

    // Update all matched rules
    let successCount = 0
    const errors: string[] = []

    for (const update of updates) {
      const { error } = await adminClient
        .from('product_mapping_rules')
        .update({
          product_id: update.product_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)

      if (error) {
        errors.push(`Failed to update "${update.name}": ${error.message}`)
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      success: true,
      assigned: successCount,
      notFound,
      errors,
      message: `Přiřazeno ${successCount} pravidel. ${notFound.length > 0 ? `Nenalezeno: ${notFound.join(', ')}` : ''}`,
    })
  } catch (error) {
    console.error('Error in auto-assign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
