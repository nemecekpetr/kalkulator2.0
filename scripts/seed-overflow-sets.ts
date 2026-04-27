/**
 * Seed přelivových bazénových setů (sety s přelivem) z XLSM souborů.
 *
 * Workflow:
 *   1. Načte 6 souborů z `přeliv/MUSTR PŘELIV {N}m .xlsm`
 *   2. Načte 6 odpovídajících skimmer setů z DB (kvůli zkopírování set_addons)
 *   3. Vytvoří 6 přelivových setů s deterministickými kódy `set{N}-pr`
 *
 * Modes:
 *   --dry-run            (default) jen vypíše plán
 *   --apply              vytvoří chybějící sety (INSERT ON CONFLICT DO NOTHING)
 *   --apply --force-update  aktualizuje i existující (bez přepsání pipedrive_id)
 *   --only set4-pr       pracuje jen s jedním setem
 *   --rollback           smaže všechny set*-pr produkty
 *
 * Usage:
 *   npx tsx scripts/seed-overflow-sets.ts --dry-run
 *   npx tsx scripts/seed-overflow-sets.ts --apply --only set4-pr
 *   npx tsx scripts/seed-overflow-sets.ts --apply --force-update
 *   npx tsx scripts/seed-overflow-sets.ts --rollback
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import ExcelJS from 'exceljs'

loadEnv({ path: '.env.local' })

// ─── Constants ──────────────────────────────────────────────────────────

const PRELIV_DIR = path.join(process.cwd(), 'přeliv')

// File → (skimmer set code, dimension key, target overflow code)
const SET_FILES = [
  { file: 'MUSTR PŘELIV 4m .xlsm',  skimmer: 'set4',  overflow: 'set4-pr',  dim: '4×3×1.2m' },
  { file: 'MUSTR PŘELIV 5m .xlsm',  skimmer: 'set5',  overflow: 'set5-pr',  dim: '5×3×1.2m' },
  { file: 'MUSTR PŘELIV 6m .xlsm',  skimmer: 'set6',  overflow: 'set6-pr',  dim: '6×3×1.2m' },
  { file: 'MUSTR PŘELIV 61m .xlsm', skimmer: 'set65', overflow: 'set65-pr', dim: '6×3.5×1.2m' },
  { file: 'MUSTR PŘELIV 7m .xlsm',  skimmer: 'set7',  overflow: 'set7-pr',  dim: '7×3×1.2m' },
  { file: 'MUSTR PŘELIV 71m .xlsm', skimmer: 'set75', overflow: 'set75-pr', dim: '7×3.5×1.2m' },
] as const

// Rows in the source XLSM (1-based, matching openpyxl iter_rows index)
const ROW_DIMENSION = 15        // contains size in col A and skeleton price
const ROW_STANDARD_START = 15   // first standard equipment row
const ROW_STANDARD_END = 23     // last standard equipment row (Roman stairs)
const ROW_INSTALL = 26          // "Montáž" row
const ROW_EXTRAS_START = 30     // first nadstandard row
const ROW_EXTRAS_END = 50       // last nadstandard row to scan (skip beyond)
const ROW_TOTAL = 66            // "Standard a nadstandard celkem" row, total in col D

// Column indices (1-based for ExcelJS)
const COL_NAME = 1
const COL_QTY = 2
const COL_TOTAL = 4

// ─── Args parsing ───────────────────────────────────────────────────────

interface Args {
  dryRun: boolean
  apply: boolean
  forceUpdate: boolean
  rollback: boolean
  only: string | null
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Args = {
    dryRun: !argv.includes('--apply') && !argv.includes('--rollback'),
    apply: argv.includes('--apply'),
    forceUpdate: argv.includes('--force-update'),
    rollback: argv.includes('--rollback'),
    only: null,
  }
  const onlyIdx = argv.indexOf('--only')
  if (onlyIdx >= 0 && argv[onlyIdx + 1]) {
    args.only = argv[onlyIdx + 1]
  }
  return args
}

// ─── Excel parsing ──────────────────────────────────────────────────────

interface SetItem {
  name: string
  qty: number
}

interface ParsedSet {
  fileName: string
  rawDimension: string  // e.g. "4x3x1,2"
  skeletonPrice: number
  standardItems: SetItem[]
  installPrice: number
  extrasItems: SetItem[]
  totalPrice: number    // celková cena bez DPH (Standard + Nadstandard)
}

function cellString(v: ExcelJS.CellValue | null | undefined): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && 'result' in v && v.result !== undefined) {
    return cellString(v.result as ExcelJS.CellValue)
  }
  if (typeof v === 'object' && 'text' in v) {
    return String(v.text || '').trim()
  }
  return String(v).trim()
}

function cellNumber(v: ExcelJS.CellValue | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const cleaned = v.replace(',', '.').replace(/\s/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  if (typeof v === 'object' && 'result' in v && v.result !== undefined) {
    return cellNumber(v.result as ExcelJS.CellValue)
  }
  return 0
}

async function parseXlsm(filePath: string): Promise<ParsedSet> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const sheet = wb.worksheets[0]
  if (!sheet) throw new Error(`Sheet not found in ${filePath}`)

  // Skeleton row (R15) — contains dimension in col A
  const skeletonRow = sheet.getRow(ROW_DIMENSION)
  const rawDimension = cellString(skeletonRow.getCell(COL_NAME).value)
  const skeletonPrice = cellNumber(skeletonRow.getCell(COL_TOTAL).value)
  if (!rawDimension) throw new Error(`No dimension found at row ${ROW_DIMENSION} in ${filePath}`)

  // Standard items: R16..R23 (skeleton itself in R15 is name=dimension, treated separately)
  const standardItems: SetItem[] = []
  for (let r = ROW_STANDARD_START + 1; r <= ROW_STANDARD_END; r++) {
    const row = sheet.getRow(r)
    const name = cellString(row.getCell(COL_NAME).value)
    const qty = cellNumber(row.getCell(COL_QTY).value)
    if (!name || qty <= 0) continue
    standardItems.push({ name, qty })
  }

  // Install price (Montáž)
  const installRow = sheet.getRow(ROW_INSTALL)
  const installName = cellString(installRow.getCell(COL_NAME).value)
  const installPrice = cellNumber(installRow.getCell(COL_TOTAL).value)
  if (!installName.toLowerCase().includes('montáž')) {
    throw new Error(`Expected Montáž at row ${ROW_INSTALL}, got: "${installName}"`)
  }

  // Nadstandard items with qty > 0
  const extrasItems: SetItem[] = []
  for (let r = ROW_EXTRAS_START; r <= ROW_EXTRAS_END; r++) {
    const row = sheet.getRow(r)
    const name = cellString(row.getCell(COL_NAME).value)
    const qty = cellNumber(row.getCell(COL_QTY).value)
    if (!name || qty <= 0) continue
    if (name.toLowerCase().includes('doprava')) continue  // explicitně Doprava se nezahrnuje
    extrasItems.push({ name, qty })
  }

  // Total price (Standard a nadstandard celkem) — col D in row 66
  const totalRow = sheet.getRow(ROW_TOTAL)
  const totalLabel = cellString(totalRow.getCell(COL_NAME).value)
  const totalPrice = cellNumber(totalRow.getCell(COL_TOTAL).value)
  if (!totalLabel.toLowerCase().includes('standard a nadstandard')) {
    throw new Error(`Expected total label at row ${ROW_TOTAL}, got: "${totalLabel}"`)
  }
  if (totalPrice <= 0) {
    throw new Error(`Total price at row ${ROW_TOTAL} col D is 0 or invalid`)
  }

  return {
    fileName: path.basename(filePath),
    rawDimension,
    skeletonPrice,
    standardItems,
    installPrice,
    extrasItems,
    totalPrice,
  }
}

// ─── Description builder ────────────────────────────────────────────────

function buildDescription(parsed: ParsedSet, dim: string): string {
  const formatItem = (item: SetItem): string => {
    if (item.qty === 1) return `• ${item.name}`
    // For overflow channel/grid use meters, otherwise count
    const lower = item.name.toLowerCase()
    const isLinearMeasure =
      lower.includes('žlábek') ||
      lower.includes('mřížka')
    const unit = isLinearMeasure ? 'm' : '×'
    return `• ${item.name} (${item.qty}${unit === '×' ? '×' : ' ' + unit})`
  }

  const lines: string[] = []
  lines.push(
    `Přelivový bazénový skelet obdélníkového tvaru se zaoblenými rohy z vysoce kvalitního polypropylénu německé výroby. Rozměr ${dim}.`
  )
  lines.push('')
  lines.push('Set obsahuje:')
  for (const item of parsed.standardItems) {
    lines.push(formatItem(item))
  }
  lines.push('• Montáž')

  if (parsed.extrasItems.length > 0) {
    lines.push('')
    lines.push('V ceně dále:')
    for (const item of parsed.extrasItems) {
      lines.push(formatItem(item))
    }
  }

  return lines.join('\n')
}

// ─── DB operations ──────────────────────────────────────────────────────

interface SetAddon {
  id: string
  name: string
  price: number
  sort_order: number
}

interface SkimmerSet {
  id: string
  code: string
  name: string
  set_addons: SetAddon[] | null
}

function buildSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function fetchSkimmerSets(
  supabase: ReturnType<typeof buildSupabase>,
  codes: string[]
): Promise<SkimmerSet[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, code, name, set_addons')
    .in('code', codes)
    .eq('category', 'sety')

  if (error) throw new Error(`Failed to fetch skimmer sets: ${error.message}`)
  return (data ?? []) as SkimmerSet[]
}

function transformAddonsForOverflow(
  skimmerCode: string,
  overflowCode: string,
  addons: SetAddon[]
): SetAddon[] {
  // Replace ID prefix `sa-{skimmerCode}-` → `sa-{overflowCode}-`
  return addons.map((a) => ({
    id: a.id.replace(`sa-${skimmerCode}-`, `sa-${overflowCode}-`),
    name: a.name,
    price: a.price,
    sort_order: a.sort_order,
  }))
}

interface OverflowProductPlan {
  code: string
  name: string
  description: string
  unit_price: number
  set_addons: SetAddon[]
  parsed: ParsedSet  // for reporting
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs()
  const supabase = buildSupabase()

  console.log('═'.repeat(70))
  console.log('Seed přelivových bazénových setů')
  console.log('═'.repeat(70))
  console.log(
    `Mode: ${args.rollback ? 'ROLLBACK' : args.apply ? (args.forceUpdate ? 'APPLY (force-update)' : 'APPLY (insert-only)') : 'DRY-RUN'}`
  )
  if (args.only) console.log(`Filter: --only ${args.only}`)
  console.log()

  // ─── Rollback ─────────────────────────────────────────────────────────
  if (args.rollback) {
    const codes = SET_FILES.filter((f) => !args.only || f.overflow === args.only).map(
      (f) => f.overflow
    )
    console.log('Smažu produkty:', codes.join(', '))
    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .in('code', codes)
    if (error) throw new Error(`Rollback failed: ${error.message}`)
    console.log(`✓ Smazáno ${count ?? 0} produktů`)
    return
  }

  // ─── Pre-flight: load skimmer sets ────────────────────────────────────
  const skimmerCodes = SET_FILES.map((f) => f.skimmer)
  const skimmerSets = await fetchSkimmerSets(supabase, skimmerCodes)

  const missing = skimmerCodes.filter((c) => !skimmerSets.find((s) => s.code === c))
  if (missing.length > 0) {
    throw new Error(`Skimmer sets missing in DB: ${missing.join(', ')}`)
  }
  for (const s of skimmerSets) {
    if (!s.set_addons || s.set_addons.length !== 8) {
      throw new Error(
        `Skimmer set ${s.code} has unexpected addon_count=${s.set_addons?.length ?? 0} (expected 8)`
      )
    }
  }
  console.log(`✓ Pre-flight: 6 skimmer setů × 8 addonů, OK`)
  console.log()

  // ─── Parse excels + build plans ────────────────────────────────────────
  const targets = SET_FILES.filter((f) => !args.only || f.overflow === args.only)

  const plans: OverflowProductPlan[] = []
  for (const target of targets) {
    const filePath = path.join(PRELIV_DIR, target.file)
    const parsed = await parseXlsm(filePath)
    const skimmer = skimmerSets.find((s) => s.code === target.skimmer)!
    const addons = transformAddonsForOverflow(
      target.skimmer,
      target.overflow,
      skimmer.set_addons!
    )

    plans.push({
      code: target.overflow,
      name: `Bazénový set ${target.dim} s přelivem`,
      description: buildDescription(parsed, target.dim),
      unit_price: Math.round(parsed.totalPrice),
      set_addons: addons,
      parsed,
    })
  }

  // ─── Report ───────────────────────────────────────────────────────────
  for (const p of plans) {
    console.log('─'.repeat(70))
    console.log(`Kód: ${p.code}`)
    console.log(`Název: ${p.name}`)
    console.log(`Cena bez DPH: ${p.unit_price.toLocaleString('cs-CZ')} Kč`)
    console.log(`Zdroj: ${p.parsed.fileName} (rozměr ${p.parsed.rawDimension})`)
    console.log(`Položky standardu: ${p.parsed.standardItems.length}`)
    for (const item of p.parsed.standardItems) {
      console.log(`  - ${item.name}  ×${item.qty}`)
    }
    console.log(`Položky nadstandard (qty>0): ${p.parsed.extrasItems.length}`)
    for (const item of p.parsed.extrasItems) {
      console.log(`  - ${item.name}  ×${item.qty}`)
    }
    console.log(`Set addonů (kopie ze ${p.set_addons[0]?.id.split('-').slice(0, 3).join('-') || '?'}): ${p.set_addons.length}`)
    for (const a of p.set_addons) {
      console.log(`  - ${a.id}  ${a.name}  ${a.price.toLocaleString('cs-CZ')} Kč`)
    }
    console.log()
    console.log('Description preview:')
    console.log(p.description.split('\n').map((l) => `  │ ${l}`).join('\n'))
    console.log()
  }

  if (args.dryRun) {
    console.log('═'.repeat(70))
    console.log('✓ Dry-run hotov. Spusť `--apply` pro zápis do DB.')
    return
  }

  // ─── Apply ────────────────────────────────────────────────────────────
  let created = 0
  let updated = 0
  let skipped = 0

  for (const p of plans) {
    // Check if exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, code')
      .eq('code', p.code)
      .maybeSingle()

    if (existing) {
      if (!args.forceUpdate) {
        console.log(`⊝ ${p.code}: existuje, přeskakuji (use --force-update)`)
        skipped++
        continue
      }
      // Update — explicitly omit pipedrive_id, pipedrive_synced_at
      const { error } = await supabase
        .from('products')
        .update({
          name: p.name,
          description: p.description,
          unit_price: p.unit_price,
          set_addons: p.set_addons,
          tags: ['prelivovy'],
          active: true,
        })
        .eq('id', existing.id)
      if (error) throw new Error(`Update ${p.code} failed: ${error.message}`)
      console.log(`✎ ${p.code}: aktualizováno`)
      updated++
    } else {
      // Insert
      const { error } = await supabase.from('products').insert({
        name: p.name,
        code: p.code,
        category: 'sety',
        unit: 'ks',
        unit_price: p.unit_price,
        price_type: 'fixed',
        description: p.description,
        set_addons: p.set_addons,
        tags: ['prelivovy'],
        active: true,
      })
      if (error) throw new Error(`Insert ${p.code} failed: ${error.message}`)
      console.log(`✓ ${p.code}: vytvořeno`)
      created++
    }
  }

  console.log()
  console.log('═'.repeat(70))
  console.log(`Hotovo: ${created} vytvořeno, ${updated} aktualizováno, ${skipped} přeskočeno`)
}

main().catch((err) => {
  console.error('\n✗ ERROR:', err.message)
  process.exit(1)
})
