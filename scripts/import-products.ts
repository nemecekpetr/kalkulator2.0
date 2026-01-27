/**
 * Product Import Script
 * Imports products from CSV files into the database
 *
 * Usage: npx tsx scripts/import-products.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Type definitions
type ProductCategory =
  | 'skelety'
  | 'sety'
  | 'schodiste'
  | 'technologie'
  | 'osvetleni'
  | 'uprava_vody'
  | 'protiproud'
  | 'ohrev'
  | 'material'
  | 'priplatky'
  | 'chemie'
  | 'zatepleni'
  | 'vysavace'
  | 'sluzby'
  | 'doprava'
  | 'jine'

type PriceType = 'fixed' | 'percentage' | 'coefficient'
type CoefficientUnit = 'm2' | 'bm'

interface ProductInsert {
  name: string
  code?: string | null
  description?: string | null
  category: ProductCategory
  subcategory?: string | null
  unit_price: number
  unit: string
  active: boolean
  price_type: PriceType
  price_reference_product_id?: string | null
  price_percentage?: number | null
  price_minimum?: number | null
  price_coefficient?: number | null
  coefficient_unit?: CoefficientUnit
  tags?: string[] | null
}

// Parse Czech number format (comma as decimal separator)
function parsePrice(value: string): number {
  if (!value || value.trim() === '') return 0

  // Remove currency symbol, spaces, and non-numeric characters except comma and minus
  let cleaned = value.replace(/[^\d,.-]/g, '')

  // Replace comma with dot for decimal
  cleaned = cleaned.replace(',', '.')

  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.round(num) // Round to whole number for Kč
}

// Parse CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

// Map CSV category to database category
function mapCategory(csvCategory: string): ProductCategory {
  const normalized = csvCategory.toLowerCase().trim()

  const mapping: Record<string, ProductCategory> = {
    'bazény': 'priplatky',
    'bazény kruh': 'skelety',
    'bazény skimmer': 'skelety',
    'bazény přeliv': 'skelety',
    schodiště: 'schodiste',
    technologie: 'technologie',
    osvětlení: 'osvetleni',
    'úprava vody': 'uprava_vody',
    protiproud: 'protiproud',
    ohřev: 'ohrev',
    materiál: 'material',
    příplatky: 'priplatky',
    chemie: 'chemie',
    zateplení: 'zatepleni',
    vysavače: 'vysavace',
  }

  return mapping[normalized] || 'jine'
}

// Generate product code from name and dimensions
function generateCode(
  type: 'skeleton' | 'set' | 'accessory',
  shape?: 'circle' | 'rectangle',
  poolType?: 'skimmer' | 'overflow',
  dimensions?: { length?: number; width?: number; diameter?: number; depth?: number }
): string | null {
  if (type === 'skeleton' && shape && poolType && dimensions) {
    if (shape === 'circle' && dimensions.diameter && dimensions.depth) {
      // BAZ-KRH-D{diameter}-H{depth}
      return `BAZ-KRH-D${dimensions.diameter.toString().replace('.', '')}-H${dimensions.depth.toString().replace('.', '')}`
    } else if (dimensions.length && dimensions.width && dimensions.depth) {
      const prefix = poolType === 'overflow' ? 'BAZ-OBD-PR' : 'BAZ-OBD-SK'
      return `${prefix}-${dimensions.length}-${dimensions.width.toString().replace('.', '')}-${dimensions.depth.toString().replace('.', '')}`
    }
  }

  if (type === 'set' && dimensions) {
    return `SET-${dimensions.length}-${dimensions.width?.toString().replace('.', '')}-${dimensions.depth?.toString().replace('.', '')}`
  }

  return null
}

// Parse Skelety kruh.csv
async function parseCircularPools(): Promise<ProductInsert[]> {
  const filePath = path.join(process.cwd(), 'csv', 'produkty rentmil - Skelety kruh.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter((line) => line.trim())

  const products: ProductInsert[] = []

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 5) continue

    const [, , diameterStr, depthStr, priceStr] = fields
    const diameter = parseFloat(diameterStr.replace(',', '.'))
    const depth = parseFloat(depthStr.replace(',', '.'))
    const price = parsePrice(priceStr)

    if (isNaN(diameter) || isNaN(depth)) continue

    products.push({
      name: `Bazénový skelet kruh ${diameter}m × ${depth}m`,
      code: generateCode('skeleton', 'circle', 'skimmer', { diameter, depth }),
      description: `Kruhový bazénový skelet, průměr ${diameter} m, hloubka ${depth} m`,
      category: 'skelety',
      subcategory: 'kruh',
      unit_price: price,
      unit: 'ks',
      active: true,
      price_type: 'fixed',
      tags: ['kruh', 'skelet'],
    })
  }

  return products
}

// Parse Skelety obdélník skimmer.csv
async function parseRectangularSkimmerPools(): Promise<ProductInsert[]> {
  const filePath = path.join(process.cwd(), 'csv', 'produkty rentmil - Skelety obdélník skimmer.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter((line) => line.trim())

  const products: ProductInsert[] = []

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 6) continue

    const [, , lengthStr, widthStr, depthStr, priceStr] = fields
    const length = parseFloat(lengthStr.replace(',', '.'))
    const width = parseFloat(widthStr.replace(',', '.'))
    const depth = parseFloat(depthStr.replace(',', '.'))
    const price = parsePrice(priceStr)

    if (isNaN(length) || isNaN(width) || isNaN(depth)) continue

    products.push({
      name: `Bazénový skelet obdélník skimmer ${length}×${width}×${depth}m`,
      code: generateCode('skeleton', 'rectangle', 'skimmer', { length, width, depth }),
      description: `Obdélníkový bazénový skelet skimmer, rozměry ${length}×${width}×${depth} m`,
      category: 'skelety',
      subcategory: 'obdelnik_skimmer',
      unit_price: price,
      unit: 'ks',
      active: true,
      price_type: 'fixed',
      tags: ['obdelnik', 'skimmer', 'skelet'],
    })
  }

  return products
}

// Parse skelety obdélník přeliv.csv
async function parseRectangularOverflowPools(): Promise<ProductInsert[]> {
  const filePath = path.join(process.cwd(), 'csv', 'produkty rentmil - skelety obdélník přeliv.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter((line) => line.trim())

  const products: ProductInsert[] = []

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 6) continue

    const [, , lengthStr, widthStr, depthStr, priceStr] = fields
    const length = parseFloat(lengthStr.replace(',', '.'))
    const width = parseFloat(widthStr.replace(',', '.'))
    const depth = parseFloat(depthStr.replace(',', '.'))
    const price = parsePrice(priceStr)

    if (isNaN(length) || isNaN(width) || isNaN(depth)) continue

    products.push({
      name: `Bazénový skelet obdélník přeliv ${length}×${width}×${depth}m`,
      code: generateCode('skeleton', 'rectangle', 'overflow', { length, width, depth }),
      description: `Obdélníkový bazénový skelet přelivový, rozměry ${length}×${width}×${depth} m`,
      category: 'skelety',
      subcategory: 'obdelnik_preliv',
      unit_price: price,
      unit: 'ks',
      active: true,
      price_type: 'fixed',
      tags: ['obdelnik', 'preliv', 'skelet'],
    })
  }

  return products
}

// Parse Bazénové sety.csv
async function parsePoolSets(): Promise<ProductInsert[]> {
  const filePath = path.join(process.cwd(), 'csv', 'produkty rentmil - Bazénové sety.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter((line) => line.trim())

  const products: ProductInsert[] = []

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 6) continue

    const [, codeStr, lengthStr, widthStr, depthStr, priceStr] = fields
    const length = parseFloat(lengthStr.replace(',', '.'))
    const width = parseFloat(widthStr.replace(',', '.'))
    const depth = parseFloat(depthStr.replace(',', '.'))
    const price = parsePrice(priceStr)

    if (isNaN(length) || isNaN(width) || isNaN(depth)) continue

    products.push({
      name: `Bazénový set ${length}×${width}×${depth}m`,
      code: codeStr.trim() || generateCode('set', undefined, undefined, { length, width, depth }),
      description: `Kompletní bazénový set včetně příslušenství, rozměry ${length}×${width}×${depth} m`,
      category: 'sety',
      unit_price: price,
      unit: 'ks',
      active: true,
      price_type: 'fixed',
      tags: ['set', 'komplet'],
    })
  }

  return products
}

// Parse Seznam doplňků.csv
async function parseAccessories(): Promise<ProductInsert[]> {
  const filePath = path.join(process.cwd(), 'csv', 'produkty rentmil - Seznam doplňků.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter((line) => line.trim())

  const products: ProductInsert[] = []

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 3) continue

    const [name, categoryStr, priceStr] = fields
    const trimmedName = name.trim()
    const category = mapCategory(categoryStr)
    const price = parsePrice(priceStr)

    // Skip empty names
    if (!trimmedName) continue

    // Special handling for specific products
    if (trimmedName.toLowerCase().includes('8 mm materiál') || trimmedName.toLowerCase().includes('8mm materiál')) {
      // 8mm tloušťka - coefficient with m² (650 Kč/m²)
      products.push({
        name: 'Příplatek 8mm tloušťka dna a stěn',
        code: 'PRIPLATEK-8MM',
        description: 'Příplatek za silnější 8mm materiál na dno a stěny bazénu. Cena se počítá podle povrchu bazénu.',
        category: 'priplatky',
        unit_price: 0,
        unit: 'm²',
        active: true,
        price_type: 'coefficient',
        price_coefficient: 650,
        coefficient_unit: 'm2',
        tags: ['priplatek', 'material', '8mm'],
      })
      continue
    }

    if (trimmedName.toLowerCase().includes('ostré rohy')) {
      // Ostré rohy - percentage pricing (10% of skeleton)
      products.push({
        name: 'Příplatek za ostré rohy',
        code: 'PRIPLATEK-OSTRE-ROHY',
        description: 'Příplatek za ostré rohy bazénového skeletu. Cena se počítá jako 10% z ceny bazénového skeletu.',
        category: 'priplatky',
        unit_price: 0,
        unit: 'ks',
        active: true,
        price_type: 'percentage',
        price_percentage: 10,
        // Note: price_reference_product_id will need to be set manually to the skeleton product
        tags: ['priplatek', 'ostre_rohy'],
      })
      continue
    }

    if (trimmedName.toLowerCase().includes('lemová trubka') || trimmedName.toLowerCase().includes('bazénová lemová trubka')) {
      // Lemová trubka - coefficient with bm (180 Kč/bm)
      products.push({
        name: 'Bazénová lemová trubka',
        code: 'LEMOVA-TRUBKA',
        description: 'Bazénová lemová trubka. Cena se počítá podle obvodu bazénu.',
        category: 'material',
        unit_price: 0,
        unit: 'bm',
        active: true,
        price_type: 'coefficient',
        price_coefficient: 180,
        coefficient_unit: 'bm',
        tags: ['material', 'lemova_trubka'],
      })
      continue
    }

    // Default fixed price product
    let unit = 'ks'
    if (trimmedName.toLowerCase().includes('/m2') || trimmedName.toLowerCase().includes('m2') || trimmedName.toLowerCase().includes('m²')) {
      unit = 'm²'
    } else if (trimmedName.toLowerCase().includes('/m') || trimmedName.toLowerCase().includes('bm')) {
      unit = 'bm'
    } else if (trimmedName.toLowerCase().includes('kg')) {
      unit = 'kg'
    }

    products.push({
      name: trimmedName,
      code: null,
      description: null,
      category,
      unit_price: price,
      unit,
      active: true,
      price_type: 'fixed',
      tags: null,
    })
  }

  return products
}

// Main import function
async function importProducts() {
  console.log('Starting product import...\n')

  // Parse all CSV files
  console.log('Parsing CSV files...')

  const circularPools = await parseCircularPools()
  console.log(`  - Kruhové bazény: ${circularPools.length}`)

  const skimmerPools = await parseRectangularSkimmerPools()
  console.log(`  - Obdélníkové skimmer: ${skimmerPools.length}`)

  const overflowPools = await parseRectangularOverflowPools()
  console.log(`  - Obdélníkové přeliv: ${overflowPools.length}`)

  const sets = await parsePoolSets()
  console.log(`  - Bazénové sety: ${sets.length}`)

  const accessories = await parseAccessories()
  console.log(`  - Doplňky: ${accessories.length}`)

  const allProducts = [...circularPools, ...skimmerPools, ...overflowPools, ...sets, ...accessories]
  console.log(`\nTotal products to import: ${allProducts.length}`)

  // Insert products in batches
  const batchSize = 50
  let inserted = 0
  let errors = 0

  for (let i = 0; i < allProducts.length; i += batchSize) {
    const batch = allProducts.slice(i, i + batchSize)

    const { data, error } = await supabase.from('products').insert(batch).select()

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message)
      errors += batch.length
    } else {
      inserted += data?.length || 0
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)}`)
    }
  }

  console.log(`\n✅ Import complete!`)
  console.log(`   Inserted: ${inserted}`)
  console.log(`   Errors: ${errors}`)

  // Summary by category
  console.log('\nProducts by category:')
  const byCategory = allProducts.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`)
    })
}

// Run import
importProducts().catch(console.error)
