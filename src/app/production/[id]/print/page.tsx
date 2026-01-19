import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProductionOrder, ProductionOrderItem } from '@/lib/supabase/types'
import { PoolSchematic } from '@/components/pool-schematic'
import { verifyPrintToken } from '@/lib/pdf/print-token'
import { formatDateShort } from '@/lib/utils/format'

// This page is used for PDF generation via Puppeteer
// Access is secured by signed token with expiration

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

interface PoolConfig {
  shape?: string
  type?: string
  dimensions?: {
    diameter?: number
    width?: number
    length?: number
    depth?: number
  }
  color?: string
  stairs?: string
  lighting?: string
  counterflow?: string
  technology?: string[]
  accessories?: string[]
}

const POOL_SHAPE_LABELS: Record<string, string> = {
  circle: 'Kruhový',
  rectangle_rounded: 'Obdélník zaoblený',
  rectangle_sharp: 'Obdélník ostrý',
}

const POOL_TYPE_LABELS: Record<string, string> = {
  skimmer: 'Skimmer',
  overflow: 'Přelivový',
}

const POOL_COLOR_LABELS: Record<string, string> = {
  blue: 'Modrá',
  white: 'Bílá',
  gray: 'Šedá',
  combination: 'Kombinace',
}

async function getProductionOrder(id: string) {
  const supabase = await createAdminClient()

  const { data: productionOrder, error } = await supabase
    .from('production_orders')
    .select('*, production_order_items(*), orders(order_number, customer_name, customer_phone, customer_address, delivery_address, delivery_date, pool_config)')
    .eq('id', id)
    .single()

  if (error || !productionOrder) {
    return null
  }

  return productionOrder as ProductionOrder & {
    production_order_items: ProductionOrderItem[]
    orders?: {
      order_number: string
      customer_name: string
      customer_phone: string | null
      customer_address: string | null
      delivery_address: string | null
      delivery_date: string | null
      pool_config: PoolConfig | null
    } | null
  }
}

// Use shared formatDateShort from @/lib/utils/format

function groupItemsByCategory(items: ProductionOrderItem[]): Record<string, ProductionOrderItem[]> {
  return items.reduce((acc, item) => {
    const category = item.category || 'Ostatní'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, ProductionOrderItem[]>)
}

export default async function ProductionPrintPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams

  // Verify print token - required for all requests
  const tokenResult = verifyPrintToken(token, id, 'production')
  if (!tokenResult.valid) {
    notFound() // Return 404 to not leak info about existence
  }

  const production = await getProductionOrder(id)

  if (!production) {
    notFound()
  }

  const items = production.production_order_items || []
  const groupedItems = groupItemsByCategory(items)
  const categories = Object.keys(groupedItems).sort()

  const checkedCount = items.filter((item) => item.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  // Extract pool config from order for schematic
  const poolConfig = production.orders?.pool_config
  const hasLighting = !!(poolConfig?.lighting && poolConfig.lighting !== 'none')
  const hasCounterflow = !!(poolConfig?.counterflow && poolConfig.counterflow !== 'none')

  return (
    <html>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>{`${production.production_number} - Výrobní zadání`}</title>
        <style>{`
          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 10px;
            color: #01384B;
            line-height: 1.4;
            background: white;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            background: white;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 10px;
            border-bottom: 3px solid #01384B;
            margin-bottom: 15px;
          }

          .logo {
            height: 40px;
          }

          .production-info {
            text-align: right;
          }

          .production-number {
            font-size: 18px;
            font-weight: 700;
            color: #01384B;
          }

          .production-date {
            font-size: 10px;
            color: #666;
            margin-top: 4px;
          }

          .title {
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
            color: #01384B;
          }

          .progress-box {
            text-align: center;
            background: #F0F9FF;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 15px;
          }

          .progress-text {
            font-size: 12px;
            font-weight: 700;
            color: #01384B;
          }

          .dates-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
          }

          .date-box {
            flex: 1;
            padding: 8px;
            background: #F8FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 4px;
            text-align: center;
          }

          .date-label {
            font-size: 8px;
            color: #666;
            margin-bottom: 2px;
          }

          .date-value {
            font-size: 10px;
            font-weight: 700;
            color: #01384B;
          }

          .two-column {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
          }

          .column {
            flex: 1;
          }

          .schematic-box {
            background: #F8FAFB;
            padding: 10px;
            border: 1px solid #48A9A6;
            border-radius: 4px;
          }

          .schematic-title {
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 8px;
            color: #01384B;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .schematic-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 180px;
          }

          .schematic-container svg {
            max-width: 100%;
            height: auto;
          }

          .pool-specs-summary {
            display: flex;
            justify-content: space-around;
            padding-top: 8px;
            margin-top: 8px;
            border-top: 1px solid #E5E7EB;
            font-size: 9px;
            color: #01384B;
          }

          .pool-specs-summary span {
            text-align: center;
          }

          .pool-specs-summary strong {
            color: #666;
            font-weight: 400;
          }

          .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #FFFFFF;
            background: #01384B;
            padding: 6px;
            margin-bottom: 8px;
          }

          .info-row {
            display: flex;
            padding: 4px 0;
            border-bottom: 1px solid #E5E7EB;
          }

          .info-label {
            width: 80px;
            font-size: 9px;
            color: #666;
          }

          .info-value {
            flex: 1;
            font-size: 10px;
            font-weight: 700;
          }

          /* Materials table */
          .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          .materials-table th {
            background: #01384B;
            color: white;
            font-size: 9px;
            font-weight: 700;
            padding: 6px;
            text-align: left;
          }

          .materials-table th.center {
            text-align: center;
          }

          .category-row td {
            background: #E5E7EB;
            font-size: 9px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 4px 6px;
          }

          .materials-table td {
            padding: 5px 6px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 9px;
          }

          .materials-table tr:nth-child(even) {
            background: #F8FAFB;
          }

          .materials-table tr.checked {
            background: #F0FDF4;
            text-decoration: line-through;
            opacity: 0.7;
          }

          .checkbox {
            width: 12px;
            height: 12px;
            border: 1px solid #666;
            border-radius: 2px;
            display: inline-block;
          }

          .checkbox.checked {
            background: #22C55E;
            border-color: #22C55E;
            text-align: center;
            color: white;
            line-height: 12px;
            font-size: 8px;
          }

          .center {
            text-align: center;
          }

          .notes-box {
            margin-top: 15px;
            padding: 10px;
            background: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 4px;
          }

          .notes-title {
            font-size: 10px;
            font-weight: 700;
            color: #92400E;
            margin-bottom: 4px;
          }

          .notes-text {
            font-size: 9px;
            color: #92400E;
            line-height: 1.4;
          }

          .signature-section {
            display: flex;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #E5E7EB;
          }

          .signature-box {
            flex: 1;
            text-align: center;
          }

          .signature-line {
            width: 120px;
            border-bottom: 1px solid #666;
            margin: 0 auto 4px;
            height: 30px;
          }

          .signature-label {
            font-size: 8px;
            color: #666;
          }

          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #666;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .page {
              width: 100%;
              min-height: auto;
              padding: 0;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          {/* Header */}
          <div className="header">
            <Image
              src="/logo-transparent.svg"
              alt="Rentmil"
              width={100}
              height={40}
              className="logo"
            />
            <div className="production-info">
              <div className="production-number">{production.production_number}</div>
              <div className="production-date">Vytvořeno: {formatDateShort(production.created_at)}</div>
            </div>
          </div>

          <div className="title">Výrobní zadání</div>

          {/* Progress */}
          <div className="progress-box">
            <div className="progress-text">
              Stav: {checkedCount} / {totalCount} položek ({progress}%)
            </div>
          </div>

          {/* Dates */}
          <div className="dates-grid">
            <div className="date-box">
              <div className="date-label">Zahájení výroby</div>
              <div className="date-value">{formatDateShort(production.production_start_date)}</div>
            </div>
            <div className="date-box">
              <div className="date-label">Dokončení výroby</div>
              <div className="date-value">{formatDateShort(production.production_end_date)}</div>
            </div>
            <div className="date-box">
              <div className="date-label">Datum montáže</div>
              <div className="date-value">{formatDateShort(production.assembly_date)}</div>
            </div>
            {production.orders?.delivery_date && (
              <div className="date-box">
                <div className="date-label">Dodání</div>
                <div className="date-value">{formatDateShort(production.orders.delivery_date)}</div>
              </div>
            )}
          </div>

          {/* Pool schematic + Order info */}
          <div className="two-column">
            {/* Pool schematic drawing */}
            <div className="column">
              <div className="schematic-box">
                <div className="schematic-title">Nákres bazénu</div>
                <div className="schematic-container">
                  <PoolSchematic
                    shape={production.pool_shape}
                    type={production.pool_type}
                    dimensions={production.pool_dimensions}
                    depth={production.pool_depth}
                    color={production.pool_color}
                    stairs={poolConfig?.stairs}
                    hasLighting={hasLighting}
                    hasCounterflow={hasCounterflow}
                    scale={0.75}
                  />
                </div>
                {/* Pool specs summary below schematic */}
                <div className="pool-specs-summary">
                  <span><strong>Tvar:</strong> {POOL_SHAPE_LABELS[production.pool_shape || ''] || production.pool_shape || '-'}</span>
                  <span><strong>Typ:</strong> {POOL_TYPE_LABELS[production.pool_type || ''] || production.pool_type || '-'}</span>
                  <span><strong>Barva:</strong> {POOL_COLOR_LABELS[production.pool_color || ''] || production.pool_color || '-'}</span>
                </div>
              </div>
            </div>

            {/* Order & Customer info */}
            <div className="column">
              <div className="section-title">Objednávka</div>
              {production.orders && (
                <>
                  <div className="info-row">
                    <div className="info-label">Číslo obj.</div>
                    <div className="info-value">{production.orders.order_number}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Zákazník</div>
                    <div className="info-value">{production.orders.customer_name}</div>
                  </div>
                  {production.orders.customer_phone && (
                    <div className="info-row">
                      <div className="info-label">Telefon</div>
                      <div className="info-value">{production.orders.customer_phone}</div>
                    </div>
                  )}
                  {(production.orders.delivery_address || production.orders.customer_address) && (
                    <div className="info-row">
                      <div className="info-label">Dodání</div>
                      <div className="info-value">
                        {production.orders.delivery_address || production.orders.customer_address}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="info-row">
                <div className="info-label">Přiřazeno</div>
                <div className="info-value">{production.assigned_to || 'Nepřiřazeno'}</div>
              </div>
            </div>
          </div>

          {/* Materials checklist */}
          <div className="section-title">Materiálový kusovník</div>
          <table className="materials-table">
            <thead>
              <tr>
                <th style={{ width: '25px' }} className="center"></th>
                <th style={{ width: '80px' }}>Kód</th>
                <th>Název materiálu</th>
                <th style={{ width: '60px' }} className="center">Množství</th>
                <th style={{ width: '40px' }}>Jedn.</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => [
                <tr key={`cat-${category}`} className="category-row">
                  <td colSpan={5}>{category}</td>
                </tr>,
                ...groupedItems[category]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <tr key={item.id} className={item.checked ? 'checked' : ''}>
                      <td className="center">
                        <span className={`checkbox ${item.checked ? 'checked' : ''}`}>
                          {item.checked ? 'V' : ''}
                        </span>
                      </td>
                      <td>{item.material_code || '-'}</td>
                      <td>{item.material_name}</td>
                      <td className="center">{item.quantity}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))
              ])}
            </tbody>
          </table>

          {/* Notes */}
          {(production.notes || production.internal_notes) && (
            <div className="notes-box">
              <div className="notes-title">Poznámky</div>
              {production.notes && <div className="notes-text">{production.notes}</div>}
              {production.internal_notes && (
                <div className="notes-text" style={{ marginTop: '4px' }}>
                  Interní: {production.internal_notes}
                </div>
              )}
            </div>
          )}

          {/* Signature section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Vyrobil</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Zkontroloval</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Datum</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <div>Rentmil s.r.o. | www.rentmil.cz</div>
            <div>{production.production_number}</div>
          </div>
        </div>
      </body>
    </html>
  )
}
