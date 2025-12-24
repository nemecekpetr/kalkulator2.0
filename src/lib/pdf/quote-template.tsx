import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import type { QuoteWithItems, QuoteItemCategory, UserProfile } from '@/lib/supabase/types'

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
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 10,
    color: '#01384B',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#48A9A6',
  },
  logo: {
    width: 120,
    height: 50,
  },
  logoSubtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  quoteInfo: {
    textAlign: 'right',
  },
  quoteNumber: {
    fontSize: 14,
    fontWeight: 700,
    color: '#01384B',
  },
  quoteDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  // Title
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Customer section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  customerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  customerField: {
    width: '50%',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  // Pool config
  poolConfig: {
    backgroundColor: '#F8FAFB',
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  poolConfigGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  poolConfigItem: {
    width: '33.33%',
    marginBottom: 10,
  },
  // Items table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#01384B',
    padding: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFB',
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellName: {
    flex: 3,
  },
  tableCellCategory: {
    flex: 1.5,
  },
  tableCellQty: {
    flex: 1,
    textAlign: 'center',
  },
  tableCellPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableCellTotal: {
    flex: 1.5,
    textAlign: 'right',
    fontWeight: 700,
  },
  // Category badge
  categoryBadge: {
    fontSize: 7,
    backgroundColor: '#E5E7EB',
    color: '#374151',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  // Totals
  totalsSection: {
    marginLeft: 'auto',
    width: 200,
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#01384B',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#01384B',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#01384B',
  },
  // Notes
  notes: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 8,
    color: '#666',
  },
  validity: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#48A9A6',
    borderRadius: 4,
    textAlign: 'center',
  },
  validityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 700,
  },
  // Terms
  terms: {
    marginTop: 30,
    fontSize: 8,
    color: '#666',
    lineHeight: 1.6,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 8,
  },
  // Specialist section
  specialist: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#48A9A6',
  },
  specialistTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 8,
  },
  specialistInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specialistField: {
    width: '33.33%',
    marginBottom: 4,
  },
})

const CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazény',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
  prace: 'Práce',
  doprava: 'Doprava',
  jine: 'Jiné',
}

interface QuotePDFProps {
  quote: QuoteWithItems
  poolConfig?: {
    shape?: string
    type?: string
    dimensions?: { length?: number; width?: number; diameter?: number; depth?: number }
    color?: string
    stairs?: string
    technology?: string
  }
  logoUrl?: string
  specialist?: {
    full_name: string
    email?: string | null
    phone?: string | null
  } | null
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function QuotePDF({ quote, poolConfig, logoUrl, specialist }: QuotePDFProps) {
  // Group items by category
  const itemsByCategory = quote.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof quote.items>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoUrl ? (
              <Image style={styles.logo} src={logoUrl} />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#48A9A6' }}>Rentmil</Text>
            )}
            <Text style={styles.logoSubtitle}>Výroba bazénů na míru</Text>
          </View>
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
            <Text style={styles.quoteDate}>{formatDate(quote.created_at)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>CENOVÁ NABÍDKA</Text>

        {/* Customer info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zákazník</Text>
          <View style={styles.customerInfo}>
            <View style={styles.customerField}>
              <Text style={styles.fieldLabel}>Jméno</Text>
              <Text style={styles.fieldValue}>{quote.customer_name}</Text>
            </View>
            {quote.customer_email && (
              <View style={styles.customerField}>
                <Text style={styles.fieldLabel}>E-mail</Text>
                <Text style={styles.fieldValue}>{quote.customer_email}</Text>
              </View>
            )}
            {quote.customer_phone && (
              <View style={styles.customerField}>
                <Text style={styles.fieldLabel}>Telefon</Text>
                <Text style={styles.fieldValue}>{quote.customer_phone}</Text>
              </View>
            )}
            {quote.customer_address && (
              <View style={styles.customerField}>
                <Text style={styles.fieldLabel}>Adresa</Text>
                <Text style={styles.fieldValue}>{quote.customer_address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pool configuration */}
        {poolConfig && (
          <View style={styles.poolConfig}>
            <Text style={styles.sectionTitle}>Konfigurace bazénu</Text>
            <View style={styles.poolConfigGrid}>
              {poolConfig.shape && (
                <View style={styles.poolConfigItem}>
                  <Text style={styles.fieldLabel}>Tvar</Text>
                  <Text style={styles.fieldValue}>{poolConfig.shape}</Text>
                </View>
              )}
              {poolConfig.type && (
                <View style={styles.poolConfigItem}>
                  <Text style={styles.fieldLabel}>Typ</Text>
                  <Text style={styles.fieldValue}>{poolConfig.type}</Text>
                </View>
              )}
              {poolConfig.dimensions && (
                <View style={styles.poolConfigItem}>
                  <Text style={styles.fieldLabel}>Rozměry</Text>
                  <Text style={styles.fieldValue}>
                    {poolConfig.dimensions.diameter
                      ? `Ø ${poolConfig.dimensions.diameter} × ${poolConfig.dimensions.depth} m`
                      : `${poolConfig.dimensions.length} × ${poolConfig.dimensions.width} × ${poolConfig.dimensions.depth} m`}
                  </Text>
                </View>
              )}
              {poolConfig.color && (
                <View style={styles.poolConfigItem}>
                  <Text style={styles.fieldLabel}>Barva</Text>
                  <Text style={styles.fieldValue}>{poolConfig.color}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Items table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Položky nabídky</Text>
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Položka</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellCategory]}>Kategorie</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellQty]}>Množství</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellPrice]}>Cena/ks</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellTotal]}>Celkem</Text>
            </View>

            {/* Table rows */}
            {quote.items.map((item, index) => (
              <View
                key={item.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, styles.tableCellName]}>{item.name}</Text>
                <View style={styles.tableCellCategory}>
                  <Text style={styles.categoryBadge}>
                    {CATEGORY_LABELS[item.category]}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellQty]}>
                  {item.quantity} {item.unit}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellPrice]}>
                  {formatPrice(item.unit_price)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellTotal]}>
                  {formatPrice(item.total_price)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Mezisoučet</Text>
              <Text style={styles.totalValue}>{formatPrice(quote.subtotal)}</Text>
            </View>
            {quote.discount_percent > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sleva ({quote.discount_percent}%)</Text>
                <Text style={styles.totalValue}>
                  -{formatPrice(quote.subtotal * (quote.discount_percent / 100))}
                </Text>
              </View>
            )}
            {quote.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Sleva</Text>
                <Text style={styles.totalValue}>-{formatPrice(quote.discount_amount)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>CELKEM</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(quote.total_price)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Poznámky</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Validity */}
        {quote.valid_until && (
          <View style={styles.validity}>
            <Text style={styles.validityText}>
              Platnost nabídky do: {formatDate(quote.valid_until)}
            </Text>
          </View>
        )}

        {/* Specialist */}
        {specialist && (
          <View style={styles.specialist}>
            <Text style={styles.specialistTitle}>Váš bazénový specialista</Text>
            <View style={styles.specialistInfo}>
              <View style={styles.specialistField}>
                <Text style={styles.fieldLabel}>Jméno</Text>
                <Text style={styles.fieldValue}>{specialist.full_name}</Text>
              </View>
              {specialist.email && (
                <View style={styles.specialistField}>
                  <Text style={styles.fieldLabel}>E-mail</Text>
                  <Text style={styles.fieldValue}>{specialist.email}</Text>
                </View>
              )}
              {specialist.phone && (
                <View style={styles.specialistField}>
                  <Text style={styles.fieldLabel}>Telefon</Text>
                  <Text style={styles.fieldValue}>{specialist.phone}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Obchodní podmínky</Text>
          <Text>
            • Ceny jsou uvedeny včetně DPH{'\n'}
            • Cena nezahrnuje zemní práce a přípravu podloží{'\n'}
            • Dodací lhůta: 4-8 týdnů od objednání{'\n'}
            • Platební podmínky: záloha 50% při objednání, doplatek při předání{'\n'}
            • Záruka na bazénovou konstrukci: 10 let{'\n'}
            • Záruka na technologii: 2 roky
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Rentmil s.r.o. | IČO: 12345678 | www.rentmil.cz
          </Text>
          <Text style={styles.footerText}>
            Tel: +420 123 456 789 | info@rentmil.cz
          </Text>
        </View>
      </Page>
    </Document>
  )
}
