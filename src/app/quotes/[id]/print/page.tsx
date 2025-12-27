import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Quote, QuoteItem, QuoteItemCategory, UserProfile, QuoteVariant } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; variant?: string }>
}

const CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazény',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
  prace: 'Práce',
  doprava: 'Doprava',
  jine: 'Jiné',
}

interface QuoteItemWithVariantIds extends QuoteItem {
  variant_ids?: string[]
}

interface QuoteWithCreator extends Quote {
  items: QuoteItemWithVariantIds[]
  creator: Pick<UserProfile, 'full_name' | 'email' | 'phone'> | null
  variants?: QuoteVariant[]
}

async function getQuote(id: string): Promise<QuoteWithCreator | null> {
  const supabase = await createAdminClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !quote) {
    return null
  }

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  // Fetch variants
  const { data: variants } = await supabase
    .from('quote_variants')
    .select('*')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true })

  // Fetch item-variant associations
  const itemIds = (items || []).map((i) => i.id)
  let associations: { quote_item_id: string; quote_variant_id: string }[] = []
  if (itemIds.length > 0) {
    const { data: assocData } = await supabase
      .from('quote_item_variants')
      .select('quote_item_id, quote_variant_id')
      .in('quote_item_id', itemIds)
    associations = assocData || []
  }

  // Add variant_ids to items
  const itemsWithVariants = (items || []).map((item) => ({
    ...item,
    variant_ids: associations
      .filter((a) => a.quote_item_id === item.id)
      .map((a) => a.quote_variant_id),
  }))

  // Fetch creator profile if created_by is set
  let creator: Pick<UserProfile, 'full_name' | 'email' | 'phone'> | null = null
  if (quote.created_by) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone')
      .eq('id', quote.created_by)
      .single()
    if (profile) {
      creator = profile
    }
  }

  return {
    ...quote,
    items: itemsWithVariants,
    variants: variants || [],
    creator,
  } as QuoteWithCreator
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Block that should not be split across pages
function PrintBlock({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} className={className}>
      {children}
    </div>
  )
}

// Title page component - no header/footer needed
function TitlePage({ quote }: { quote: QuoteWithCreator }) {
  return (
    <div className="w-[210mm] h-[297mm] mx-auto bg-white relative overflow-hidden">
      {/* Hero Image */}
      <div className="relative h-[180mm]">
        <img
          src="/bazen-hero.jpg"
          alt="Bazén Rentmil"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#01384B]/90 via-[#01384B]/30 to-transparent" />

        {/* Glassmorphism box */}
        <div className="absolute top-8 left-8 right-8">
          <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 shadow-xl border border-white/50">
            <div className="flex items-center justify-between">
              <img src="/logo-transparent.svg" alt="Rentmil" className="h-24 object-contain" />
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Číslo kalkulace</p>
                <p className="text-2xl font-bold text-[#01384B]">{quote.quote_number}</p>
                <p className="text-sm text-gray-500">{formatDate(quote.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Title box at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h1 className="text-5xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Cenová nabídka
          </h1>
          <p className="text-xl text-[#48A9A6]">
            Pro: {quote.customer_name}
          </p>
        </div>
      </div>

      {/* Bottom section with mascot and customer info */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="grid grid-cols-2 gap-8 items-center">
          {/* Left: Holding Mascot - HQ version */}
          <div className="flex items-center justify-start">
            <img
              src="/maskot-holding-hq.png"
              alt="Bazénový mistr"
              className="h-96 object-contain"
            />
          </div>

          {/* Right: Customer info - centered vertically with mascot */}
          <div className="flex items-center">
            <div className="backdrop-blur-md bg-white/90 rounded-2xl p-8 shadow-xl border border-white/50 w-full">
              <h3 className="text-lg font-semibold text-[#48A9A6] uppercase tracking-wider mb-4">
                Vážený zákazník
              </h3>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-[#01384B]">{quote.customer_name}</p>
                {quote.customer_email && (
                  <p className="text-gray-600 text-base">{quote.customer_email}</p>
                )}
                {quote.customer_phone && (
                  <p className="text-gray-600 text-base">{quote.customer_phone}</p>
                )}
                {quote.customer_address && (
                  <p className="text-gray-600 text-base">{quote.customer_address}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Items display component - used by both regular and variant content
function ItemsSection({
  items,
  subtotal,
  discountPercent,
  discountAmount,
  totalPrice
}: {
  items: QuoteItemWithVariantIds[]
  subtotal: number
  discountPercent: number
  discountAmount: number
  totalPrice: number
}) {
  // Group items by category
  const itemsByCategory = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, QuoteItemWithVariantIds[]>
  )

  return (
    <div className="mb-8">
      {/* Items by category */}
      <div className="space-y-3">
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <PrintBlock key={category}>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Category header */}
              <div className="bg-[#01384B] text-white px-3 py-1.5">
                <span className="font-semibold text-xs">{CATEGORY_LABELS[category as QuoteItemCategory]}</span>
              </div>
              {/* Items */}
              <div className="divide-y divide-gray-100">
                {categoryItems.map((item) => (
                  <div key={item.id} className="px-3 py-1.5 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-[#01384B] text-xs">{item.name}</p>
                      {item.description && (
                        <p className="text-[10px] text-gray-500 leading-tight">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-[10px] text-gray-500">
                        {item.quantity} {item.unit} × {formatPrice(item.unit_price)}
                      </p>
                      <p className="font-semibold text-[#01384B] text-xs">{formatPrice(item.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PrintBlock>
        ))}
      </div>

      {/* Totals */}
      <PrintBlock className="mt-4 flex justify-end">
        <div className="w-56">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Mezisoučet</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between py-1 text-green-600">
                <span>Sleva {discountPercent}%</span>
                <span>-{formatPrice(subtotal * (discountPercent / 100))}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between py-1 text-green-600">
                <span>Sleva</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
          </div>
          {/* Grand total */}
          <div className="mt-2 rounded-lg bg-gradient-to-r from-[#FF8621] to-[#ED6663] p-3 text-white">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Celkem</span>
              <span className="text-lg font-bold">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>
      </PrintBlock>
    </div>
  )
}

// Variant content pages component - shows items for a specific variant
function VariantContentPages({ quote, variant }: { quote: QuoteWithCreator; variant: QuoteVariant }) {
  // Get items for this variant
  const variantItems = quote.items.filter((item) => item.variant_ids?.includes(variant.id))

  // Calculate validity date (30 days from creation if not set)
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until)
    : new Date(new Date(quote.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className="w-[210mm] mx-auto bg-white px-10">
      {/* Variant Title */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-[#01384B] mb-1">
          {variant.variant_name}
        </h2>
        <div className="inline-block bg-[#48A9A6]/10 rounded-full px-4 py-1">
          <span className="text-[#48A9A6] font-semibold">{formatPrice(variant.total_price)}</span>
        </div>
      </div>

      {/* Items Section */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#01384B] mb-4 text-center">
          Položky nabídky
        </h3>
        <ItemsSection
          items={variantItems}
          subtotal={variant.subtotal}
          discountPercent={variant.discount_percent}
          discountAmount={variant.discount_amount}
          totalPrice={variant.total_price}
        />
      </div>

      {/* Terms Section - only on last variant page or non-variant */}
      <PrintBlock className="mb-12">
        {/* Notes */}
        {quote.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#01384B] mb-4">
              Poznámky
            </h3>
            <div className="bg-[#FEF3C7] rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[#01384B] mb-4">
            Obchodní podmínky
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 space-y-3 text-sm text-gray-700">
            <p>• Ceny jsou uvedeny včetně DPH</p>
            <p>• Cena nezahrnuje zemní práce a přípravu podloží</p>
            <p>• Dodací lhůta: 4-8 týdnů od objednání</p>
            <p>• Platební podmínky: záloha 50% při objednání, doplatek při předání</p>
            <p>• Záruka na bazénovou konstrukci: 10 let</p>
            <p>• Záruka na technologii: 2 roky</p>
            <p>• Materiál: kvalitní plast Polystone P od německého výrobce Röchling</p>
          </div>
        </div>

        {/* Validity */}
        <div className="mb-8 flex justify-center">
          <div className="inline-block rounded-xl border-2 border-[#48A9A6] px-8 py-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Platnost nabídky do</p>
            <p className="text-2xl font-bold text-[#01384B]">{formatDate(validUntil.toISOString())}</p>
          </div>
        </div>
      </PrintBlock>
    </div>
  )
}

// Comparison page component - shows all variants side by side
function ComparisonPage({ quote }: { quote: QuoteWithCreator }) {
  const variants = quote.variants || []
  const items = quote.items

  // Sort variants by total_price for consistent display
  const sortedVariants = [...variants].sort((a, b) => a.total_price - b.total_price)

  return (
    <div className="w-[210mm] mx-auto bg-white px-10">
      {/* Title */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-[#01384B] mb-2">
          Porovnání variant
        </h2>
        <p className="text-gray-600">Přehled položek a cen jednotlivých variant nabídky</p>
      </div>

      {/* Comparison Table */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200">
        {/* Header */}
        <div className="bg-[#01384B] text-white">
          <div className="grid" style={{ gridTemplateColumns: `2fr ${sortedVariants.map(() => '1fr').join(' ')}` }}>
            <div className="px-3 py-2 font-semibold text-xs">Položka</div>
            {sortedVariants.map((v) => (
              <div key={v.id} className="px-3 py-2 font-semibold text-xs text-center border-l border-white/20">
                {v.variant_name}
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`grid ${index % 2 === 1 ? 'bg-gray-50' : ''}`}
              style={{ gridTemplateColumns: `2fr ${sortedVariants.map(() => '1fr').join(' ')}` }}
            >
              <div className="px-3 py-2 text-xs text-[#01384B]">
                {item.name}
              </div>
              {sortedVariants.map((v) => (
                <div key={v.id} className="px-3 py-2 text-center border-l border-gray-100">
                  {item.variant_ids?.includes(v.id) ? (
                    <span className="text-green-600 font-bold">✓</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Totals Row */}
        <div
          className="bg-gradient-to-r from-[#FF8621] to-[#ED6663] text-white grid"
          style={{ gridTemplateColumns: `2fr ${sortedVariants.map(() => '1fr').join(' ')}` }}
        >
          <div className="px-3 py-3 font-bold text-sm">CELKEM</div>
          {sortedVariants.map((v) => (
            <div key={v.id} className="px-3 py-3 font-bold text-sm text-center border-l border-white/20">
              {formatPrice(v.total_price)}
            </div>
          ))}
        </div>
      </div>

      {/* Last Section - 7 důvodů, specialista, maskot */}
      <PrintBlock>
        {/* 7 důvodů pro náš bazén */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#01384B] mb-3">
            7 důvodů pro bazén od Rentmilu
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Prohlídka showroomu</p>
              <p className="text-[10px] text-gray-600 leading-tight">V našem showroomu v Plzni si můžete prohlédnout modely bazénů včetně zastřešení.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Široký výběr</p>
              <p className="text-[10px] text-gray-600 leading-tight">Dostupné i luxusní bazény v různých tvarech a velikostech pro každého.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Bazénové zastřešení</p>
              <p className="text-[10px] text-gray-600 leading-tight">Koupání až 7 měsíců v roce bez ohledu na počasí.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Kompletní servis</p>
              <p className="text-[10px] text-gray-600 leading-tight">Údržba, zazimování a jarní zprovoznění bazénu.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Bazénové příslušenství</p>
              <p className="text-[10px] text-gray-600 leading-tight">Filtrace, ohřev, LED osvětlení, protiproudy a další.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Bazény na klíč</p>
              <p className="text-[10px] text-gray-600 leading-tight">Kompletní výroba, instalace a doporučení stavebních firem.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Profesionální poradenství</p>
              <p className="text-[10px] text-gray-600 leading-tight">Pomoc s výběrem místa a technologií pro údržbu vody.</p>
            </div>
          </div>
        </div>

        {/* Bazénový specialista kontakt */}
        {quote.creator && (
          <div className="mb-6 flex justify-center">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 w-80">
              <p className="text-sm text-[#48A9A6] uppercase tracking-wider mb-1">Váš bazénový specialista</p>
              <p className="text-xl font-bold text-[#01384B] mb-2">{quote.creator.full_name}</p>
              <div className="flex gap-8 text-sm text-gray-600">
                {quote.creator.phone && <span>{quote.creator.phone}</span>}
                {quote.creator.email && <span>{quote.creator.email}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Large mascot with tagline */}
        <div className="flex flex-col items-center justify-center py-8">
          <img
            src="/maskot-hq.png"
            alt="Bazénový mistr"
            className="w-72 h-72 object-contain mb-3"
          />
          <p className="text-2xl font-semibold text-[#01384B] italic text-center">
            „Vy zenujete, my bazénujeme."
          </p>
        </div>
      </PrintBlock>
    </div>
  )
}

// Content pages component - header/footer will be added by Puppeteer
function ContentPages({ quote }: { quote: QuoteWithCreator }) {
  // Group items by category
  const itemsByCategory = quote.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, QuoteItemWithVariantIds[]>
  )

  // Calculate validity date (30 days from creation if not set)
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until)
    : new Date(new Date(quote.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className="w-[210mm] mx-auto bg-white px-10">
      {/* Items Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#01384B] mb-4 text-center">
          Položky nabídky
        </h2>

        {/* Items by category */}
        <div className="space-y-3">
          {Object.entries(itemsByCategory).map(([category, items]) => (
            <PrintBlock key={category}>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                {/* Category header */}
                <div className="bg-[#01384B] text-white px-3 py-1.5">
                  <span className="font-semibold text-xs">{CATEGORY_LABELS[category as QuoteItemCategory]}</span>
                </div>
                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="px-3 py-1.5 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#01384B] text-xs">{item.name}</p>
                        {item.description && (
                          <p className="text-[10px] text-gray-500 leading-tight">{item.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-[10px] text-gray-500">
                          {item.quantity} {item.unit} × {formatPrice(item.unit_price)}
                        </p>
                        <p className="font-semibold text-[#01384B] text-xs">{formatPrice(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PrintBlock>
          ))}
        </div>

        {/* Totals */}
        <PrintBlock className="mt-4 flex justify-end">
          <div className="w-56">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Mezisoučet</span>
                <span className="font-medium">{formatPrice(quote.subtotal)}</span>
              </div>
              {quote.discount_percent > 0 && (
                <div className="flex justify-between py-1 text-green-600">
                  <span>Sleva {quote.discount_percent}%</span>
                  <span>-{formatPrice(quote.subtotal * (quote.discount_percent / 100))}</span>
                </div>
              )}
              {quote.discount_amount > 0 && (
                <div className="flex justify-between py-1 text-green-600">
                  <span>Sleva</span>
                  <span>-{formatPrice(quote.discount_amount)}</span>
                </div>
              )}
            </div>
            {/* Grand total */}
            <div className="mt-2 rounded-lg bg-gradient-to-r from-[#FF8621] to-[#ED6663] p-3 text-white">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Celkem</span>
                <span className="text-lg font-bold">{formatPrice(quote.total_price)}</span>
              </div>
            </div>
          </div>
        </PrintBlock>
      </div>

      {/* Terms Section */}
      <PrintBlock className="mb-12">
        {/* Notes */}
        {quote.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[#01384B] mb-4">
              Poznámky
            </h3>
            <div className="bg-[#FEF3C7] rounded-xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-[#01384B] mb-4">
            Obchodní podmínky
          </h3>
          <div className="bg-gray-50 rounded-xl p-6 space-y-3 text-sm text-gray-700">
            <p>• Ceny jsou uvedeny včetně DPH</p>
            <p>• Cena nezahrnuje zemní práce a přípravu podloží</p>
            <p>• Dodací lhůta: 4-8 týdnů od objednání</p>
            <p>• Platební podmínky: záloha 50% při objednání, doplatek při předání</p>
            <p>• Záruka na bazénovou konstrukci: 10 let</p>
            <p>• Záruka na technologii: 2 roky</p>
            <p>• Materiál: kvalitní plast Polystone P od německého výrobce Röchling</p>
          </div>
        </div>

        {/* Validity */}
        <div className="mb-8 flex justify-center">
          <div className="inline-block rounded-xl border-2 border-[#48A9A6] px-8 py-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Platnost nabídky do</p>
            <p className="text-2xl font-bold text-[#01384B]">{formatDate(validUntil.toISOString())}</p>
          </div>
        </div>
      </PrintBlock>

      {/* Last Section - 7 důvodů, specialista, maskot */}
      <PrintBlock>
        {/* 7 důvodů pro náš bazén */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#01384B] mb-3">
            7 důvodů pro bazén od Rentmilu
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Prohlídka showroomu</p>
              <p className="text-[10px] text-gray-600 leading-tight">V našem showroomu v Plzni si můžete prohlédnout modely bazénů včetně zastřešení.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Široký výběr</p>
              <p className="text-[10px] text-gray-600 leading-tight">Dostupné i luxusní bazény v různých tvarech a velikostech pro každého.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Bazénové zastřešení</p>
              <p className="text-[10px] text-gray-600 leading-tight">Koupání až 7 měsíců v roce bez ohledu na počasí.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Kompletní servis</p>
              <p className="text-[10px] text-gray-600 leading-tight">Údržba, zazimování a jarní zprovoznění bazénu.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Bazénové příslušenství</p>
              <p className="text-[10px] text-gray-600 leading-tight">Filtrace, ohřev, LED osvětlení, protiproudy a další.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Bazény na klíč</p>
              <p className="text-[10px] text-gray-600 leading-tight">Kompletní výroba, instalace a doporučení stavebních firem.</p>
            </div>
            <div className="bg-gradient-to-br from-[#48A9A6]/10 to-[#48A9A6]/5 rounded-lg p-3 border border-[#48A9A6]/20">
              <p className="font-semibold text-[#01384B] text-xs mb-0.5">Profesionální poradenství</p>
              <p className="text-[10px] text-gray-600 leading-tight">Pomoc s výběrem místa a technologií pro údržbu vody.</p>
            </div>
          </div>
        </div>

        {/* Bazénový specialista kontakt */}
        {quote.creator && (
          <div className="mb-6 flex justify-center">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 w-80">
              <p className="text-sm text-[#48A9A6] uppercase tracking-wider mb-1">Váš bazénový specialista</p>
              <p className="text-xl font-bold text-[#01384B] mb-2">{quote.creator.full_name}</p>
              <div className="flex gap-8 text-sm text-gray-600">
                {quote.creator.phone && <span>{quote.creator.phone}</span>}
                {quote.creator.email && <span>{quote.creator.email}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Large mascot with tagline */}
        <div className="flex flex-col items-center justify-center py-8">
          <img
            src="/maskot-hq.png"
            alt="Bazénový mistr"
            className="w-72 h-72 object-contain mb-3"
          />
          <p className="text-2xl font-semibold text-[#01384B] italic text-center">
            „Vy zenujete, my bazénujeme."
          </p>
        </div>
      </PrintBlock>
    </div>
  )
}

export default async function QuotePrintPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { page, variant } = await searchParams
  const quote = await getQuote(id)

  if (!quote) {
    notFound()
  }

  const hasVariants = quote.variants && quote.variants.length > 0

  // Render only title page
  if (page === 'title') {
    return (
      <div className="min-h-screen bg-white">
        <TitlePage quote={quote} />
      </div>
    )
  }

  // Render specific variant content (for Puppeteer multi-variant PDF)
  if (page === 'variant' && variant) {
    const selectedVariant = quote.variants?.find((v) => v.id === variant)
    if (!selectedVariant) {
      notFound()
    }
    return (
      <div className="min-h-screen bg-white">
        <VariantContentPages quote={quote} variant={selectedVariant} />
      </div>
    )
  }

  // Render comparison page
  if (page === 'comparison' && hasVariants) {
    return (
      <div className="min-h-screen bg-white">
        <ComparisonPage quote={quote} />
      </div>
    )
  }

  // Render only content pages (for Puppeteer with header/footer) - classic single-variant
  if (page === 'content') {
    return (
      <div className="min-h-screen bg-white">
        <ContentPages quote={quote} />
      </div>
    )
  }

  // Default: render all pages for preview (with inline header/footer)
  // If variants exist, show variant pages
  if (hasVariants) {
    // Sort variants by price: cheapest, most expensive, middle
    const sortedVariants = [...(quote.variants || [])].sort((a, b) => a.total_price - b.total_price)
    let orderedVariants = sortedVariants
    if (sortedVariants.length === 3) {
      orderedVariants = [sortedVariants[0], sortedVariants[2], sortedVariants[1]]
    }

    return (
      <div className="min-h-screen bg-white">
        <TitlePage quote={quote} />
        {orderedVariants.map((v) => (
          <div key={v.id} className="w-[210mm] mx-auto bg-white py-12 px-10" style={{ pageBreakBefore: 'always' }}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#48A9A6]">
              <img src="/logo-transparent.svg" alt="Rentmil" className="h-20 object-contain" />
              <p className="text-lg font-semibold text-[#01384B]">{quote.quote_number}</p>
            </div>
            <VariantContentPages quote={quote} variant={v} />
            <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 mt-8">
              <p>Rentmil s.r.o. | Lidická 1233/26, 323 00 Plzeň | +420 601 588 453 | info@rentmil.cz | www.rentmil.cz</p>
            </div>
          </div>
        ))}
        {/* Comparison page */}
        <div className="w-[210mm] mx-auto bg-white py-12 px-10" style={{ pageBreakBefore: 'always' }}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#48A9A6]">
            <img src="/logo-transparent.svg" alt="Rentmil" className="h-20 object-contain" />
            <p className="text-lg font-semibold text-[#01384B]">{quote.quote_number}</p>
          </div>
          <ComparisonPage quote={quote} />
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 mt-8">
            <p>Rentmil s.r.o. | Lidická 1233/26, 323 00 Plzeň | +420 601 588 453 | info@rentmil.cz | www.rentmil.cz</p>
          </div>
        </div>
      </div>
    )
  }

  // Classic single-page view (no variants)
  return (
    <div className="min-h-screen bg-white">
      <TitlePage quote={quote} />
      <div className="w-[210mm] mx-auto bg-white py-12 px-10" style={{ pageBreakBefore: 'always' }}>
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#48A9A6]">
          <img src="/logo-transparent.svg" alt="Rentmil" className="h-20 object-contain" />
          <p className="text-lg font-semibold text-[#01384B]">{quote.quote_number}</p>
        </div>
        <ContentPages quote={quote} />
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 mt-8">
          <p>Rentmil s.r.o. | Lidická 1233/26, 323 00 Plzeň | +420 601 588 453 | info@rentmil.cz | www.rentmil.cz</p>
        </div>
      </div>
    </div>
  )
}
