import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer'
import type { QuoteWithItems, QuoteItemCategory, QuoteVariant, QuoteItem } from '@/lib/supabase/types'

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
  variantTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#48A9A6',
    marginBottom: 10,
    textAlign: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#48A9A6',
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
  // Comparison table styles
  comparisonTable: {
    marginTop: 20,
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#01384B',
    padding: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  comparisonHeaderCell: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  comparisonCell: {
    fontSize: 9,
    textAlign: 'center',
  },
  comparisonCellName: {
    flex: 2,
    textAlign: 'left',
  },
  comparisonCellVariant: {
    flex: 1,
  },
  checkmark: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: 700,
  },
  xmark: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  comparisonTotalRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#F8FAFB',
    borderTopWidth: 2,
    borderTopColor: '#01384B',
  },
  comparisonTotalLabel: {
    flex: 2,
    fontSize: 11,
    fontWeight: 700,
    color: '#01384B',
  },
  comparisonTotalValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: '#01384B',
    textAlign: 'center',
  },
  // Summary page styles
  summaryGreeting: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 25,
    color: '#374151',
  },
  summarySection: {
    marginBottom: 20,
  },
  summarySectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#01384B',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#48A9A6',
  },
  summaryGrid: {
    backgroundColor: '#F8FAFB',
    padding: 15,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 9,
    color: '#666',
  },
  summaryValue: {
    flex: 2,
    fontSize: 10,
    fontWeight: 700,
    color: '#01384B',
  },
  summaryHighlight: {
    backgroundColor: '#48A9A6',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    marginLeft: 8,
  },
})

const CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazeny',
  prislusenstvi: 'Prislusenstvi',
  sluzby: 'Sluzby',
  prace: 'Prace',
  doprava: 'Doprava',
  jine: 'Jine',
}

interface QuoteItemWithVariantIds extends QuoteItem {
  variant_ids?: string[]
}

interface PoolConfigFull {
  shape?: string
  type?: string
  dimensions?: { length?: number; width?: number; diameter?: number; depth?: number }
  color?: string
  stairs?: string
  technology?: string
  lighting?: string
  counterflow?: string
  waterTreatment?: string
  heating?: string
  roofing?: string
}

interface QuotePDFProps {
  quote: QuoteWithItems & {
    variants?: QuoteVariant[]
    items: QuoteItemWithVariantIds[]
  }
  poolConfig?: PoolConfigFull
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

// Detect gender from Czech first name
function detectGender(fullName: string): 'male' | 'female' | 'unknown' {
  const firstName = fullName.trim().split(/\s+/)[0]?.toLowerCase() || ''

  // Common Czech female name endings
  const femaleEndings = ['a', 'ie', 'e']
  // Exceptions - male names ending in 'a'
  const maleExceptions = ['nikita', 'saša', 'sascha', 'miša', 'ilja', 'jirka', 'honza', 'pepa', 'vašek', 'franta']

  if (maleExceptions.includes(firstName)) {
    return 'male'
  }

  for (const ending of femaleEndings) {
    if (firstName.endsWith(ending)) {
      return 'female'
    }
  }

  return 'male' // Default to male for names ending in consonants (typical for Czech male names)
}

// Get formal greeting based on gender
function getFormalGreeting(fullName: string): string {
  const gender = detectGender(fullName)
  const nameParts = fullName.trim().split(/\s+/)
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

  if (gender === 'female') {
    return `Vážená paní ${lastName}`
  }
  return `Vážený pane ${lastName}`
}

// Header component for reuse
function PDFHeader({ quote, logoUrl }: { quote: QuoteWithItems; logoUrl?: string }) {
  return (
    <View style={styles.header}>
      <View>
        {logoUrl ? (
          <Image style={styles.logo} src={logoUrl} />
        ) : (
          <Text style={{ fontSize: 24, fontWeight: 700, color: '#48A9A6' }}>Rentmil</Text>
        )}
        <Text style={styles.logoSubtitle}>Vyroba bazenu na miru</Text>
      </View>
      <View style={styles.quoteInfo}>
        <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
        <Text style={styles.quoteDate}>{formatDate(quote.created_at)}</Text>
      </View>
    </View>
  )
}

// Footer component for reuse
function PDFFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Rentmil s.r.o. | ICO: 12345678 | www.rentmil.cz
      </Text>
      <Text style={styles.footerText}>
        Tel: +420 123 456 789 | info@rentmil.cz
      </Text>
    </View>
  )
}

// Customer info component
function CustomerInfo({ quote }: { quote: QuoteWithItems }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Zakaznik</Text>
      <View style={styles.customerInfo}>
        <View style={styles.customerField}>
          <Text style={styles.fieldLabel}>Jmeno</Text>
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
  )
}

// Pool config component
function PoolConfigSection({ poolConfig }: { poolConfig: QuotePDFProps['poolConfig'] }) {
  if (!poolConfig) return null

  return (
    <View style={styles.poolConfig}>
      <Text style={styles.sectionTitle}>Konfigurace bazenu</Text>
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
            <Text style={styles.fieldLabel}>Rozmery</Text>
            <Text style={styles.fieldValue}>
              {poolConfig.dimensions.diameter
                ? `O ${poolConfig.dimensions.diameter} x ${poolConfig.dimensions.depth} m`
                : `${poolConfig.dimensions.length} x ${poolConfig.dimensions.width} x ${poolConfig.dimensions.depth} m`}
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
  )
}

// Items table component
function ItemsTable({ items }: { items: QuoteItem[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Polozka</Text>
        <Text style={[styles.tableHeaderCell, styles.tableCellCategory]}>Kategorie</Text>
        <Text style={[styles.tableHeaderCell, styles.tableCellQty]}>Mnozstvi</Text>
        <Text style={[styles.tableHeaderCell, styles.tableCellPrice]}>Cena/ks</Text>
        <Text style={[styles.tableHeaderCell, styles.tableCellTotal]}>Celkem</Text>
      </View>

      {items.map((item, index) => (
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
  )
}

// Summary page component - shows configuration overview
function SummaryPage({
  quote,
  logoUrl,
  poolConfig,
}: {
  quote: QuoteWithItems
  logoUrl?: string
  poolConfig?: PoolConfigFull
}) {
  const greeting = getFormalGreeting(quote.customer_name)

  // Helper to check if value exists and is not 'none'
  const hasValue = (val?: string) => val && val !== 'none'

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader quote={quote} logoUrl={logoUrl} />

      <Text style={styles.title}>SHRNUTÍ VAŠÍ POPTÁVKY</Text>

      {/* Greeting */}
      <View style={styles.summaryGreeting}>
        <Text>{greeting},</Text>
        <Text style={{ marginTop: 8 }}>
          děkujeme za Váš zájem o bazén Rentmil. Na základě Vaší konfigurace v našem online konfigurátoru jsme pro Vás připravili tuto cenovou nabídku. Níže najdete přehled Vašich požadavků.
        </Text>
      </View>

      {/* Pool section */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>Váš vysněný bazén</Text>
        <View style={styles.summaryGrid}>
          {poolConfig?.shape && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tvar</Text>
              <Text style={styles.summaryValue}>{poolConfig.shape}</Text>
            </View>
          )}
          {poolConfig?.type && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Typ</Text>
              <Text style={styles.summaryValue}>{poolConfig.type}</Text>
            </View>
          )}
          {poolConfig?.dimensions && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rozměry</Text>
              <Text style={styles.summaryValue}>
                {poolConfig.dimensions.diameter
                  ? `Ø ${poolConfig.dimensions.diameter} m × ${poolConfig.dimensions.depth} m (hloubka)`
                  : `${poolConfig.dimensions.length} × ${poolConfig.dimensions.width} × ${poolConfig.dimensions.depth} m`}
              </Text>
            </View>
          )}
          {poolConfig?.color && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Barva</Text>
              <Text style={styles.summaryValue}>{poolConfig.color}</Text>
            </View>
          )}
          {hasValue(poolConfig?.stairs) && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>Schodiště</Text>
              <Text style={styles.summaryValue}>{poolConfig?.stairs}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Technology & accessories section */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>Technologie a příslušenství</Text>
        <View style={styles.summaryGrid}>
          {poolConfig?.technology && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Umístění technologie</Text>
              <Text style={styles.summaryValue}>{poolConfig.technology}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Osvětlení</Text>
            <Text style={styles.summaryValue}>
              {hasValue(poolConfig?.lighting) ? 'LED podvodní osvětlení' : 'Bez osvětlení'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Protiproud</Text>
            <Text style={styles.summaryValue}>
              {hasValue(poolConfig?.counterflow) ? 'Ano' : 'Ne'}
            </Text>
          </View>
          {poolConfig?.waterTreatment && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Úprava vody</Text>
              <Text style={styles.summaryValue}>{poolConfig.waterTreatment}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ohřev</Text>
            <Text style={styles.summaryValue}>
              {hasValue(poolConfig?.heating) ? poolConfig?.heating : 'Bez ohřevu'}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Zastřešení</Text>
            <Text style={styles.summaryValue}>
              {hasValue(poolConfig?.roofing) ? 'Ano' : 'Ne'}
            </Text>
          </View>
        </View>
      </View>

      {/* Contact info */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>Vaše kontaktní údaje</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Jméno</Text>
            <Text style={styles.summaryValue}>{quote.customer_name}</Text>
          </View>
          {quote.customer_email && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>E-mail</Text>
              <Text style={styles.summaryValue}>{quote.customer_email}</Text>
            </View>
          )}
          {quote.customer_phone && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Telefon</Text>
              <Text style={styles.summaryValue}>{quote.customer_phone}</Text>
            </View>
          )}
          {quote.customer_address && (
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>Adresa</Text>
              <Text style={styles.summaryValue}>{quote.customer_address}</Text>
            </View>
          )}
        </View>
      </View>

      <PDFFooter />
    </Page>
  )
}

// Variant page component
function VariantPage({
  quote,
  variant,
  items,
  logoUrl,
  poolConfig,
}: {
  quote: QuoteWithItems
  variant: QuoteVariant
  items: QuoteItem[]
  logoUrl?: string
  poolConfig?: QuotePDFProps['poolConfig']
}) {
  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader quote={quote} logoUrl={logoUrl} />

      <Text style={styles.title}>CENOVA NABIDKA</Text>
      <Text style={styles.variantTitle}>Varianta: {variant.variant_name}</Text>

      <CustomerInfo quote={quote} />
      <PoolConfigSection poolConfig={poolConfig} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Polozky nabidky</Text>
        <ItemsTable items={items} />

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Mezisoucet</Text>
            <Text style={styles.totalValue}>{formatPrice(variant.subtotal)}</Text>
          </View>
          {variant.discount_percent > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sleva ({variant.discount_percent}%)</Text>
              <Text style={styles.totalValue}>
                -{formatPrice(variant.subtotal * (variant.discount_percent / 100))}
              </Text>
            </View>
          )}
          {variant.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sleva</Text>
              <Text style={styles.totalValue}>-{formatPrice(variant.discount_amount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>CELKEM</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(variant.total_price)}</Text>
          </View>
        </View>
      </View>

      <PDFFooter />
    </Page>
  )
}

// Comparison page component
function ComparisonPage({
  quote,
  variants,
  items,
  logoUrl,
}: {
  quote: QuoteWithItems
  variants: QuoteVariant[]
  items: QuoteItemWithVariantIds[]
  logoUrl?: string
}) {
  // Get all unique items
  const uniqueItems = items

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeader quote={quote} logoUrl={logoUrl} />

      <Text style={styles.title}>POROVNANI VARIANT</Text>

      <CustomerInfo quote={quote} />

      <View style={styles.comparisonTable}>
        {/* Header */}
        <View style={styles.comparisonHeader}>
          <Text style={[styles.comparisonHeaderCell, styles.comparisonCellName]}>Polozka</Text>
          {variants.map((v) => (
            <Text key={v.id} style={[styles.comparisonHeaderCell, styles.comparisonCellVariant]}>
              {v.variant_name}
            </Text>
          ))}
        </View>

        {/* Item rows */}
        {uniqueItems.map((item, index) => (
          <View
            key={item.id}
            style={[styles.comparisonRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.comparisonCell, styles.comparisonCellName]}>{item.name}</Text>
            {variants.map((v) => (
              <Text key={v.id} style={[styles.comparisonCell, styles.comparisonCellVariant]}>
                {item.variant_ids?.includes(v.id) ? (
                  <Text style={styles.checkmark}>V</Text>
                ) : (
                  <Text style={styles.xmark}>-</Text>
                )}
              </Text>
            ))}
          </View>
        ))}

        {/* Total row */}
        <View style={styles.comparisonTotalRow}>
          <Text style={styles.comparisonTotalLabel}>CELKEM</Text>
          {variants.map((v) => (
            <Text key={v.id} style={styles.comparisonTotalValue}>
              {formatPrice(v.total_price)}
            </Text>
          ))}
        </View>
      </View>

      {/* Validity */}
      {quote.valid_until && (
        <View style={styles.validity}>
          <Text style={styles.validityText}>
            Platnost nabidky do: {formatDate(quote.valid_until)}
          </Text>
        </View>
      )}

      {/* Terms */}
      <View style={styles.terms}>
        <Text style={styles.termsTitle}>Obchodni podminky</Text>
        <Text>
          - Ceny jsou uvedeny vcetne DPH{'\n'}
          - Cena nezahrnuje zemni prace a pripravu podlozi{'\n'}
          - Dodaci lhuta: 4-8 tydnu od objednani{'\n'}
          - Platebni podminky: zaloha 50% pri objednani, doplatek pri predani{'\n'}
          - Zaruka na bazenovou konstrukci: 10 let{'\n'}
          - Zaruka na technologii: 2 roky
        </Text>
      </View>

      <PDFFooter />
    </Page>
  )
}

export function QuotePDF({ quote, poolConfig, logoUrl, specialist }: QuotePDFProps) {
  const hasVariants = quote.variants && quote.variants.length > 0

  // If no variants, render classic PDF with summary page
  if (!hasVariants) {
    return (
      <Document>
        {/* Page 1: Title page with quote items */}
        <Page size="A4" style={styles.page}>
          <PDFHeader quote={quote} logoUrl={logoUrl} />

          <Text style={styles.title}>CENOVA NABIDKA</Text>

          <CustomerInfo quote={quote} />
          <PoolConfigSection poolConfig={poolConfig} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Polozky nabidky</Text>
            <ItemsTable items={quote.items} />

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Mezisoucet</Text>
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

          {quote.notes && (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>Poznamky</Text>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}

          {quote.valid_until && (
            <View style={styles.validity}>
              <Text style={styles.validityText}>
                Platnost nabidky do: {formatDate(quote.valid_until)}
              </Text>
            </View>
          )}

          {specialist && (
            <View style={styles.specialist}>
              <Text style={styles.specialistTitle}>Vas bazenovy specialista</Text>
              <View style={styles.specialistInfo}>
                <View style={styles.specialistField}>
                  <Text style={styles.fieldLabel}>Jmeno</Text>
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

          <View style={styles.terms}>
            <Text style={styles.termsTitle}>Obchodni podminky</Text>
            <Text>
              - Ceny jsou uvedeny vcetne DPH{'\n'}
              - Cena nezahrnuje zemni prace a pripravu podlozi{'\n'}
              - Dodaci lhuta: 4-8 tydnu od objednani{'\n'}
              - Platebni podminky: zaloha 50% pri objednani, doplatek pri predani{'\n'}
              - Zaruka na bazenovou konstrukci: 10 let{'\n'}
              - Zaruka na technologii: 2 roky
            </Text>
          </View>

          <PDFFooter />
        </Page>

        {/* Page 2: Summary of configuration */}
        <SummaryPage quote={quote} logoUrl={logoUrl} poolConfig={poolConfig} />
      </Document>
    )
  }

  // Multi-variant PDF
  // Sort variants by total price: cheapest first, then most expensive, then middle
  const sortedVariants = [...(quote.variants || [])].sort((a, b) => a.total_price - b.total_price)

  // Reorder: cheapest, most expensive, middle (if 3 variants)
  let orderedVariants = sortedVariants
  if (sortedVariants.length === 3) {
    orderedVariants = [sortedVariants[0], sortedVariants[2], sortedVariants[1]]
  }

  // Get items for each variant
  const getVariantItems = (variantId: string) => {
    return quote.items.filter((item: QuoteItemWithVariantIds) => item.variant_ids?.includes(variantId))
  }

  return (
    <Document>
      {/* Page 1: Summary of configuration */}
      <SummaryPage quote={quote} logoUrl={logoUrl} poolConfig={poolConfig} />

      {/* Individual variant pages */}
      {orderedVariants.map((variant) => (
        <VariantPage
          key={variant.id}
          quote={quote}
          variant={variant}
          items={getVariantItems(variant.id)}
          logoUrl={logoUrl}
          poolConfig={poolConfig}
        />
      ))}

      {/* Comparison page at the end */}
      <ComparisonPage
        quote={quote}
        variants={quote.variants || []}
        items={quote.items}
        logoUrl={logoUrl}
      />
    </Document>
  )
}
