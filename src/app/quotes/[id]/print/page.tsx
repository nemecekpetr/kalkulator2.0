import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Quote, QuoteItem, QuoteItemCategory, UserProfile, QuoteVariant } from '@/lib/supabase/types'
import { QUOTE_CATEGORY_LABELS } from '@/lib/constants/categories'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; variant?: string; last?: string }>
}

// Use centralized category labels
const CATEGORY_LABELS = QUOTE_CATEGORY_LABELS

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

// Title page component - WOW effect with hero photo
function TitlePage({ quote }: { quote: QuoteWithCreator }) {
  return (
    <div className="w-[210mm] h-[297mm] mx-auto relative overflow-hidden">
      {/* Hero background photo */}
      <div className="absolute inset-0">
        <img
          src="/pool-hero.jpg"
          alt="Bazén Rentmil"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#01384B]/80 via-[#01384B]/50 to-[#01384B]/90" />
      </div>

      {/* Top section - Logo and quote number */}
      <div className="relative z-10 p-10">
        <div className="flex items-start justify-between">
          {/* Logo - large and prominent */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            <img src="/logo-transparent.svg" alt="Rentmil" className="h-20 object-contain" />
          </div>

          {/* Quote info badge */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 text-right">
            <p className="text-[#48A9A6] text-sm font-medium uppercase tracking-wider mb-1">Nabídka č.</p>
            <p className="text-3xl font-bold text-white">{quote.quote_number}</p>
            <p className="text-white/70 text-sm mt-1">{formatDate(quote.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Center section - Main title */}
      <div className="relative z-10 flex flex-col items-center justify-center mt-12">
        <div className="text-center">
          <p className="text-[#48A9A6] text-xl font-medium uppercase tracking-[0.3em] mb-4">
            Cenová nabídka
          </p>
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Váš vysněný bazén
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-[#FF8621] to-[#ED6663] mx-auto rounded-full mb-8" />

          {/* Customer name highlight */}
          <div className="inline-block">
            <p className="text-white/80 text-lg mb-2 drop-shadow">Připraveno pro</p>
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-8 py-4 border border-white/30">
              <p className="text-3xl font-bold text-white drop-shadow-lg">{quote.customer_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Mascot and customer details */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="flex items-end justify-between">
          {/* Mascot - large and friendly */}
          <div className="relative">
            <img
              src="/maskot-holding-hq.png"
              alt="Bazénový mistr"
              className="h-72 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Customer details card + Slogan */}
          <div className="flex flex-col items-end gap-6">
            {/* Customer info card */}
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs">
              <h3 className="text-[#48A9A6] text-sm font-semibold uppercase tracking-wider mb-3">
                Kontaktní údaje
              </h3>
              <div className="space-y-1.5">
                <p className="text-lg font-bold text-[#01384B]">{quote.customer_name}</p>
                {quote.customer_email && (
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-[#48A9A6]">email:</span> {quote.customer_email}
                  </p>
                )}
                {quote.customer_phone && (
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-[#48A9A6]">tel:</span> {quote.customer_phone}
                  </p>
                )}
                {quote.customer_address && (
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-[#48A9A6]">adresa:</span> {quote.customer_address}
                  </p>
                )}
              </div>
            </div>

            {/* Slogan */}
            <div className="text-right">
              <p className="text-2xl font-semibold text-white italic drop-shadow-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
                &bdquo;Vy zenujete, my bazénujeme.&ldquo;
              </p>
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

  // Calculate total savings
  const totalSavings = (subtotal * (discountPercent / 100)) + discountAmount

  return (
    <div className="mb-8">
      {/* Items by category */}
      <div className="space-y-4">
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <PrintBlock key={category}>
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Category header */}
              <div className="bg-[#01384B] text-white px-4 py-2">
                <span className="font-semibold text-sm">{CATEGORY_LABELS[category as QuoteItemCategory]}</span>
              </div>
              {/* Items */}
              <div className="divide-y divide-gray-100">
                {categoryItems.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-[#01384B] text-sm">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">
                        {item.quantity} {item.unit} × {formatPrice(item.unit_price)}
                      </p>
                      <p className="font-semibold text-[#01384B] text-sm">{formatPrice(item.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PrintBlock>
        ))}
      </div>

      {/* Totals */}
      <PrintBlock className="mt-6 flex justify-end">
        <div className="w-72">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Mezisoučet</span>
              <span className="font-medium text-gray-800">{formatPrice(subtotal)}</span>
            </div>

            {/* Savings highlight box */}
            {(discountPercent > 0 || discountAmount > 0) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 my-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-green-700 text-sm">Vaše úspora</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Sleva {discountPercent} %</span>
                    <span className="font-semibold">-{formatPrice(subtotal * (discountPercent / 100))}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Dodatečná sleva</span>
                    <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {(discountPercent > 0 && discountAmount > 0) && (
                  <div className="flex justify-between text-green-700 font-bold text-sm mt-1 pt-1 border-t border-green-200">
                    <span>Celková úspora</span>
                    <span>-{formatPrice(totalSavings)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grand total */}
          <div className="mt-3 rounded-xl bg-gradient-to-r from-[#FF8621] to-[#ED6663] p-4 text-white shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Celkem k úhradě</span>
              <span className="text-2xl font-bold">{formatPrice(totalPrice)}</span>
            </div>
            <p className="text-white/80 text-xs mt-1">včetně DPH</p>
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

  return (
    <div className="w-[210mm] mx-auto bg-white px-10 pt-6">
      {/* Variant Title */}
      <div className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-r from-[#48A9A6]/20 to-[#48A9A6]/10 rounded-2xl px-8 py-4 border border-[#48A9A6]/30">
          <h2 className="text-2xl font-bold text-[#01384B] mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {variant.variant_name}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-[#48A9A6]">{formatPrice(variant.total_price)}</span>
          </div>
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

      {/* Notes */}
      {quote.notes && (
        <PrintBlock className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 mb-2">
              Poznámky k nabídce
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{quote.notes}</p>
          </div>
        </PrintBlock>
      )}
    </div>
  )
}

// Closing page component - always last, fits on one page
// Varianta 3: Moderní asymetrický layout s foto pozadím v CTA
// Designed to fit within header (100px) and footer (50px) margins on A4
function ClosingPage({ quote }: { quote: QuoteWithCreator }) {
  // Calculate validity date (30 days from creation if not set)
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until)
    : new Date(new Date(quote.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className="w-[210mm] mx-auto bg-white px-10 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[#48A9A6] text-xs font-semibold uppercase tracking-widest mb-1">Proč právě my?</p>
          <h2 className="text-2xl font-bold text-[#01384B]" style={{ fontFamily: 'Nunito, sans-serif' }}>7 důvodů pro Rentmil</h2>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-5 gap-6 mb-4">
        {/* Left column - 7 důvodů */}
        <div className="col-span-3 space-y-2">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">1</div>
            <p className="font-semibold text-[#01384B] text-sm">Showroom s ukázkami bazénů</p>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">2</div>
            <p className="font-semibold text-[#01384B] text-sm">Široký výběr tvarů a velikostí</p>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">3</div>
            <p className="font-semibold text-[#01384B] text-sm">Zastřešení pro celoroční koupání</p>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">4</div>
            <p className="font-semibold text-[#01384B] text-sm">Celoroční servis a údržba</p>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">5</div>
            <p className="font-semibold text-[#01384B] text-sm">Příslušenství na jednom místě</p>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">6</div>
            <p className="font-semibold text-[#01384B] text-sm">Realizace bazénu na klíč *</p>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-[#48A9A6]/10 to-transparent border-l-4 border-[#48A9A6]">
            <div className="w-8 h-8 rounded-full bg-[#48A9A6]/20 text-[#48A9A6] flex items-center justify-center font-bold text-sm">7</div>
            <p className="font-semibold text-[#01384B] text-sm">Profesionální poradenství zdarma</p>
          </div>
        </div>

        {/* Right column - Conditions card */}
        <div className="col-span-2">
          <div className="bg-[#01384B] rounded-2xl p-4 text-white h-full">
            <h3 className="text-sm font-bold mb-3 text-[#48A9A6]">Obchodní podmínky v kostce</h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">Ceny</span>
                <span className="font-semibold">vč. DPH</span>
              </div>
              <div className="h-px bg-white/10"></div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">Záruka konstrukce</span>
                <span className="font-semibold text-[#48A9A6]">10 let</span>
              </div>
              <div className="h-px bg-white/10"></div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">Záruka technologie</span>
                <span className="font-semibold">2 roky</span>
              </div>
              <div className="h-px bg-white/10"></div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">Materiál</span>
                <span className="font-semibold">Polystone P</span>
              </div>
              <div className="h-px bg-white/10"></div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">Dodání</span>
                <span className="font-semibold">4–8 týdnů</span>
              </div>
              <div className="h-px bg-white/10"></div>

              <div className="text-xs">
                <span className="text-white/70">Platba: </span>
                <span className="font-semibold">50 % záloha</span>
              </div>
            </div>

            {/* Validity badge inside */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="bg-white/10 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-white/60 uppercase">Platnost nabídky</p>
                <p className="text-lg font-bold">{formatDate(validUntil.toISOString())}</p>
              </div>
            </div>

            {/* Link to full terms */}
            <div className="mt-3 text-center">
              <a href="https://www.rentmil.cz/obchodni-podminky" className="text-[#48A9A6] text-[10px] hover:underline">
                Kompletní obchodní podmínky →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-4 py-3 border-y border-gray-100">
        <div className="text-center">
          <p className="text-3xl font-bold text-[#48A9A6]">24</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Let zkušeností</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-[#48A9A6]">10</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Let záruka</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-[#48A9A6]">2000+</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Realizací po celé ČR</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-[#48A9A6]">4-8</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Týdnů dodání</p>
        </div>
      </div>

      {/* Footnote */}
      <p className="text-[9px] text-gray-400 mb-3">* po předchozí domluvě</p>

      {/* CTA Section with photo background - larger with mascot and slogan inside */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src="/pool-hero.jpg" alt="Bazén" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#01384B]/95 via-[#01384B]/85 to-[#01384B]/70"></div>
        </div>

        {/* Content */}
        <div className="relative p-6 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>Připraveni začít?</h3>
            <p className="text-white/70 text-base mb-4">Ozvěte se nám a probereme vaše požadavky</p>

            <div className="flex items-center gap-8 mb-5">
              {quote.creator && (
                <>
                  <div>
                    <p className="text-[#48A9A6] text-xs uppercase tracking-wider mb-1">Váš specialista</p>
                    <p className="text-white font-bold text-lg">{quote.creator.full_name}</p>
                  </div>
                  <div className="h-12 w-px bg-white/20"></div>
                </>
              )}
              <div className="space-y-1 text-base">
                <p className="text-white/90 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#48A9A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                  {quote.creator?.phone || '+420 601 588 453'}
                </p>
                <p className="text-white/90 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#48A9A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  {quote.creator?.email || 'info@rentmil.cz'}
                </p>
              </div>
            </div>

          </div>

          {/* Mascot with slogan */}
          <div className="flex flex-col items-center">
            <img src="/maskot-hq.png" alt="Maskot" className="h-40 object-contain drop-shadow-2xl mb-2" />
            {/* Slogan next to mascot */}
            <div className="bg-gradient-to-r from-[#FF8621] to-[#ED6663] rounded-xl px-5 py-2.5 shadow-lg">
              <p className="text-base font-bold text-white italic whitespace-nowrap" style={{ fontFamily: 'Nunito, sans-serif' }}>&bdquo;Vy zenujete, my bazénujeme.&ldquo;</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Comparison page component - shows all variants side by side
// Closing sections are on separate ClosingPage
function ComparisonPage({ quote }: { quote: QuoteWithCreator }) {
  const variants = quote.variants || []
  const items = quote.items

  // Sort variants by total_price for consistent display
  const sortedVariants = [...variants].sort((a, b) => a.total_price - b.total_price)

  return (
    <div className="w-[210mm] mx-auto bg-white px-10 pt-6">
      {/* Title */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-[#01384B] mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Porovnání variant
        </h2>
        <p className="text-gray-600 text-sm">Přehled položek a cen jednotlivých variant nabídky</p>
      </div>

      {/* Comparison Table - improved */}
      <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#01384B] to-[#024959] text-white">
          <div className="grid" style={{ gridTemplateColumns: `2fr ${sortedVariants.map(() => '1fr').join(' ')}` }}>
            <div className="px-4 py-3 font-semibold text-sm">Položka</div>
            {sortedVariants.map((v, idx) => (
              <div key={v.id} className="px-4 py-3 font-semibold text-sm text-center border-l border-white/20">
                <span className="block">{v.variant_name}</span>
                {idx === sortedVariants.length - 1 && (
                  <span className="text-xs text-[#48A9A6] font-normal">Doporučujeme</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`grid ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
              style={{ gridTemplateColumns: `2fr ${sortedVariants.map(() => '1fr').join(' ')}` }}
            >
              <div className="px-4 py-2.5 text-sm text-[#01384B]">
                {item.name}
              </div>
              {sortedVariants.map((v) => (
                <div key={v.id} className="px-4 py-2.5 text-center border-l border-gray-100">
                  {item.variant_ids?.includes(v.id) ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                      <span className="text-sm font-bold">✓</span>
                    </span>
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
          <div className="px-4 py-4 font-bold text-base">Celková cena</div>
          {sortedVariants.map((v) => (
            <div key={v.id} className="px-4 py-4 font-bold text-lg text-center border-l border-white/20">
              {formatPrice(v.total_price)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Content pages component - only items, no closing sections
// Closing sections are on separate ClosingPage
function ContentPages({ quote }: { quote: QuoteWithCreator }) {
  return (
    <div className="w-[210mm] mx-auto bg-white px-10 pt-6">
      {/* Items Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#01384B] mb-4 text-center" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Položky nabídky
        </h2>

        {/* Use ItemsSection component for consistency */}
        <ItemsSection
          items={quote.items}
          subtotal={quote.subtotal}
          discountPercent={quote.discount_percent}
          discountAmount={quote.discount_amount}
          totalPrice={quote.total_price}
        />
      </div>

      {/* Notes */}
      {quote.notes && (
        <PrintBlock className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 mb-2">
              Poznámky k nabídce
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{quote.notes}</p>
          </div>
        </PrintBlock>
      )}
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

  // Render closing page - always last page in document
  if (page === 'closing') {
    return (
      <div className="min-h-screen bg-white">
        <ClosingPage quote={quote} />
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
