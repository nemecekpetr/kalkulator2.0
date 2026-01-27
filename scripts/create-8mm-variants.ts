/**
 * Create 8mm Thickness Variants for Pool Skeletons
 *
 * - Updates existing skeletons to be marked as 5mm
 * - Creates 8mm variants for circular pools (+10% price)
 * - 8mm is NOT available for rounded corner rectangles
 *
 * Usage: npx tsx scripts/create-8mm-variants.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createThicknessVariants() {
  console.log('Creating 8mm thickness variants for pool skeletons...\n')

  // 1. Fetch all skeleton products
  const { data: skeletons, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('category', 'skelety')
    .order('name')

  if (fetchError) {
    console.error('Error fetching skeletons:', fetchError)
    process.exit(1)
  }

  console.log(`Found ${skeletons?.length || 0} skeleton products\n`)

  if (!skeletons || skeletons.length === 0) {
    console.log('No skeletons found. Exiting.')
    return
  }

  // 2. Update existing skeletons to be 5mm and set compatible shapes
  console.log('Updating existing skeletons to 5mm...')

  let updated5mm = 0
  let created8mm = 0
  const errors: string[] = []

  for (const skeleton of skeletons) {
    // Skip if already has thickness set
    if (skeleton.material_thickness) {
      console.log(`  Skipping ${skeleton.name} - already has thickness: ${skeleton.material_thickness}`)
      continue
    }

    // Determine pool type from subcategory or name
    const isCircular = skeleton.subcategory === 'kruh' || skeleton.name.toLowerCase().includes('kruh')
    const isOverflow = skeleton.subcategory?.includes('preliv') || skeleton.name.toLowerCase().includes('přeliv')
    const isSkimmer = skeleton.subcategory?.includes('skimmer') || skeleton.name.toLowerCase().includes('skimmer')

    // Current rectangular pools have rounded corners (zaoblené/zakulacené)
    // They can only be 5mm
    const isRoundedCorners = skeleton.name.toLowerCase().includes('zaoblené') ||
                             skeleton.name.toLowerCase().includes('zakulacené') ||
                             (!isCircular && !skeleton.name.toLowerCase().includes('ostré'))

    // Set compatible shapes for 5mm (all shapes)
    const compatibleShapes5mm = isCircular
      ? ['circle']
      : ['rectangle_rounded', 'rectangle_sharp']

    // Update to 5mm
    const { error: updateError } = await supabase
      .from('products')
      .update({
        material_thickness: '5mm',
        compatible_shapes: compatibleShapes5mm,
      })
      .eq('id', skeleton.id)

    if (updateError) {
      errors.push(`Error updating ${skeleton.name}: ${updateError.message}`)
      continue
    }
    updated5mm++

    // 3. Create 8mm variant for circular pools (NOT for rounded corner rectangles)
    if (isCircular) {
      // Create 8mm variant for circular pool
      const price8mm = Math.round(skeleton.unit_price * 1.10) // +10%

      // Generate 8mm code
      const code8mm = skeleton.code
        ? skeleton.code.replace('KRH', 'KRH-8MM')
        : null

      const { error: insertError } = await supabase
        .from('products')
        .insert({
          name: skeleton.name.replace('skelet kruh', 'skelet kruh 8mm'),
          code: code8mm,
          description: skeleton.description
            ? skeleton.description + ' Silnější 8mm materiál.'
            : 'Silnější 8mm materiál pro lepší odolnost.',
          category: 'skelety',
          subcategory: skeleton.subcategory,
          unit_price: price8mm,
          unit: skeleton.unit,
          active: true,
          price_type: 'fixed',
          material_thickness: '8mm',
          compatible_shapes: ['circle'],
          tags: ['8mm', 'kruh', 'skelet'],
        })

      if (insertError) {
        errors.push(`Error creating 8mm variant for ${skeleton.name}: ${insertError.message}`)
      } else {
        created8mm++
        console.log(`  Created 8mm: ${skeleton.name} → ${price8mm} Kč (+10%)`)
      }
    }

    // Note: For rectangular pools with rounded corners (current data),
    // we don't create 8mm variants because 8mm requires sharp corners.
    // If you add sharp corner rectangular products later, add 8mm variants for them.
  }

  console.log('\n' + '='.repeat(50))
  console.log('Summary:')
  console.log(`  Updated to 5mm: ${updated5mm}`)
  console.log(`  Created 8mm variants: ${created8mm}`)

  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`)
    errors.forEach(e => console.log(`    - ${e}`))
  }

  console.log('\n✅ Done!')
  console.log('\nNote: 8mm variants were only created for circular pools.')
  console.log('Current rectangular pools have rounded corners and cannot use 8mm.')
  console.log('To add 8mm rectangular pools, first import sharp corner versions.')
}

createThicknessVariants().catch(console.error)
