import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import type { ProductionOrder, ProductionOrderItem } from '@/lib/supabase/types'

// Register Roboto font with Czech diacritics support
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    fontSize: 10,
    color: '#01384B',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 3,
    borderBottomColor: '#01384B',
  },
  logo: {
    width: 100,
    height: 40,
  },
  productionInfo: {
    textAlign: 'right',
  },
  productionNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: '#01384B',
  },
  productionDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  // Title
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  // Two column layout
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  // Section
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: '#01384B',
    padding: 6,
    marginBottom: 8,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    width: 100,
    fontSize: 9,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
  },
  // Pool specs box
  poolSpecsBox: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#48A9A6',
  },
  poolSpecsTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 8,
    textAlign: 'center',
  },
  poolSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  poolSpecItem: {
    width: '50%',
    marginBottom: 6,
  },
  poolSpecLabel: {
    fontSize: 8,
    color: '#666',
  },
  poolSpecValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#01384B',
  },
  // Materials table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#01384B',
    padding: 6,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFB',
  },
  tableRowChecked: {
    backgroundColor: '#F0FDF4',
    textDecoration: 'line-through',
    opacity: 0.7,
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellCheckbox: {
    width: 25,
    textAlign: 'center',
  },
  tableCellCode: {
    width: 80,
  },
  tableCellName: {
    flex: 1,
  },
  tableCellQty: {
    width: 60,
    textAlign: 'center',
  },
  tableCellUnit: {
    width: 40,
  },
  // Checkbox
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 12,
  },
  // Category header
  categoryHeader: {
    backgroundColor: '#E5E7EB',
    padding: 4,
    marginTop: 8,
  },
  categoryTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Notes
  notesBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#92400E',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#92400E',
    lineHeight: 1.4,
  },
  // Signature section
  signatureSection: {
    flexDirection: 'row',
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  signatureBox: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLine: {
    width: 150,
    borderBottomWidth: 1,
    borderBottomColor: '#666',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 8,
    color: '#666',
  },
  // Progress indicator
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#01384B',
  },
  // Dates section
  datesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  dateBox: {
    flex: 1,
    padding: 8,
    backgroundColor: '#F8FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#01384B',
  },
})

const POOL_SHAPE_LABELS: Record<string, string> = {
  circle: 'Kruhovy',
  rectangle_rounded: 'Obdelnik zaobleny',
  rectangle_sharp: 'Obdelnik ostry',
}

const POOL_TYPE_LABELS: Record<string, string> = {
  skimmer: 'Skimmer',
  overflow: 'Prelivovy',
}

const POOL_COLOR_LABELS: Record<string, string> = {
  blue: 'Modra',
  white: 'Bila',
  gray: 'Seda',
  combination: 'Kombinace',
}

interface ProductionPDFProps {
  production: ProductionOrder & {
    production_order_items: ProductionOrderItem[]
    orders?: {
      order_number: string
      customer_name: string
      customer_phone: string | null
      customer_address: string | null
      delivery_address: string | null
      delivery_date: string | null
    } | null
  }
  logoUrl?: string
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

// Group items by category
function groupItemsByCategory(items: ProductionOrderItem[]): Record<string, ProductionOrderItem[]> {
  return items.reduce((acc, item) => {
    const category = item.category || 'Ostatni'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, ProductionOrderItem[]>)
}

export function ProductionPDF({ production, logoUrl }: ProductionPDFProps) {
  const items = production.production_order_items || []
  const groupedItems = groupItemsByCategory(items)
  const categories = Object.keys(groupedItems).sort()

  const checkedCount = items.filter((item) => item.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoUrl ? (
              <Image style={styles.logo} src={logoUrl} />
            ) : (
              <Text style={{ fontSize: 20, fontWeight: 700, color: '#48A9A6' }}>Rentmil</Text>
            )}
          </View>
          <View style={styles.productionInfo}>
            <Text style={styles.productionNumber}>{production.production_number}</Text>
            <Text style={styles.productionDate}>
              Vytvoreno: {formatDate(production.created_at)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Vyrobni zadani</Text>

        {/* Progress indicator */}
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>
            Stav: {checkedCount} / {totalCount} polozek ({progress}%)
          </Text>
        </View>

        {/* Dates */}
        <View style={styles.datesGrid}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Zahajeni vyroby</Text>
            <Text style={styles.dateValue}>{formatDate(production.production_start_date)}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Dokonceni vyroby</Text>
            <Text style={styles.dateValue}>{formatDate(production.production_end_date)}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Datum montaze</Text>
            <Text style={styles.dateValue}>{formatDate(production.assembly_date)}</Text>
          </View>
          {production.orders?.delivery_date && (
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Dodani</Text>
              <Text style={styles.dateValue}>{formatDate(production.orders.delivery_date)}</Text>
            </View>
          )}
        </View>

        {/* Two column layout: Pool specs & Order info */}
        <View style={styles.twoColumn}>
          {/* Pool specifications */}
          <View style={styles.column}>
            <View style={styles.poolSpecsBox}>
              <Text style={styles.poolSpecsTitle}>Specifikace bazenu</Text>
              <View style={styles.poolSpecsGrid}>
                {production.pool_dimensions && (
                  <View style={styles.poolSpecItem}>
                    <Text style={styles.poolSpecLabel}>Rozmery</Text>
                    <Text style={styles.poolSpecValue}>{production.pool_dimensions}</Text>
                  </View>
                )}
                {production.pool_depth && (
                  <View style={styles.poolSpecItem}>
                    <Text style={styles.poolSpecLabel}>Hloubka</Text>
                    <Text style={styles.poolSpecValue}>{production.pool_depth}</Text>
                  </View>
                )}
                {production.pool_shape && (
                  <View style={styles.poolSpecItem}>
                    <Text style={styles.poolSpecLabel}>Tvar</Text>
                    <Text style={styles.poolSpecValue}>
                      {POOL_SHAPE_LABELS[production.pool_shape] || production.pool_shape}
                    </Text>
                  </View>
                )}
                {production.pool_type && (
                  <View style={styles.poolSpecItem}>
                    <Text style={styles.poolSpecLabel}>Typ</Text>
                    <Text style={styles.poolSpecValue}>
                      {POOL_TYPE_LABELS[production.pool_type] || production.pool_type}
                    </Text>
                  </View>
                )}
                {production.pool_color && (
                  <View style={styles.poolSpecItem}>
                    <Text style={styles.poolSpecLabel}>Barva</Text>
                    <Text style={styles.poolSpecValue}>
                      {POOL_COLOR_LABELS[production.pool_color] || production.pool_color}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Order & Customer info */}
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Objednavka</Text>
              {production.orders && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cislo obj.</Text>
                    <Text style={styles.infoValue}>{production.orders.order_number}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Zakaznik</Text>
                    <Text style={styles.infoValue}>{production.orders.customer_name}</Text>
                  </View>
                  {production.orders.customer_phone && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Telefon</Text>
                      <Text style={styles.infoValue}>{production.orders.customer_phone}</Text>
                    </View>
                  )}
                  {(production.orders.delivery_address || production.orders.customer_address) && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Dodani</Text>
                      <Text style={styles.infoValue}>
                        {production.orders.delivery_address || production.orders.customer_address}
                      </Text>
                    </View>
                  )}
                </>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prirazeno</Text>
                <Text style={styles.infoValue}>{production.assigned_to || 'Neprirazeno'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Materials checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materialovy kusovnik</Text>

          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableCellCheckbox]}></Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellCode]}>Kod</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Nazev materialu</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellQty]}>Mnozstvi</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellUnit]}>Jedn.</Text>
            </View>

            {/* Items grouped by category */}
            {categories.map((category) => (
              <View key={category}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                </View>
                {groupedItems[category]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 ? styles.tableRowAlt : {},
                        item.checked ? styles.tableRowChecked : {},
                      ]}
                    >
                      <View style={styles.tableCellCheckbox}>
                        <View style={[styles.checkbox, item.checked ? styles.checkboxChecked : {}]}>
                          {item.checked && <Text style={styles.checkmark}>V</Text>}
                        </View>
                      </View>
                      <Text style={[styles.tableCell, styles.tableCellCode]}>
                        {item.material_code || '-'}
                      </Text>
                      <Text style={[styles.tableCell, styles.tableCellName]}>
                        {item.material_name}
                      </Text>
                      <Text style={[styles.tableCell, styles.tableCellQty]}>
                        {item.quantity}
                      </Text>
                      <Text style={[styles.tableCell, styles.tableCellUnit]}>
                        {item.unit}
                      </Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        {(production.notes || production.internal_notes) && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Poznamky</Text>
            {production.notes && <Text style={styles.notesText}>{production.notes}</Text>}
            {production.internal_notes && (
              <Text style={[styles.notesText, { marginTop: 4 }]}>
                Interni: {production.internal_notes}
              </Text>
            )}
          </View>
        )}

        {/* Signature section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Vyrobil</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Zkontroloval</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Datum</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Rentmil s.r.o. | www.rentmil.cz
          </Text>
          <Text style={styles.footerText}>
            {production.production_number}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
