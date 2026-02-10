import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Quote, QuoteItem, QuoteItemCategory, UserProfile, QuoteVariant } from '@/lib/supabase/types'
import { QUOTE_CATEGORY_LABELS } from '@/lib/constants/categories'
import { COMPANY, COMPANY_FOOTER_FULL } from '@/lib/constants/company'
import { verifyPrintToken } from '@/lib/pdf/print-token'
import { formatPrice, formatDate } from '@/lib/utils/format'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; variant?: string; last?: string; token?: string; quality?: 'email' | 'print' }>
}

// Image paths type
interface ImagePaths {
  poolHero: string
  maskotHolding: string
  maskot: string
}

// Image paths based on quality setting
// Email: optimized for small file size
// Print: full resolution for sharp printing
const IMAGE_PATHS: Record<'email' | 'print', ImagePaths> = {
  email: {
    poolHero: '/print/pool-hero-print.jpg',    // 800x533, 100KB
    maskotHolding: '/print/maskot-holding-print.png',
    maskot: '/print/maskot-print.png',
  },
  print: {
    poolHero: '/print/pool-hero-hq.jpg',       // 3871x2581, 3.8MB - full resolution
    maskotHolding: '/maskot-holding-hq.png',
    maskot: '/maskot-hq.png',
  },
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

// Block that should not be split across pages
function PrintBlock({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} className={className}>
      {children}
    </div>
  )
}

// Title page component - WOW effect with hero photo
function TitlePage({ quote, images }: { quote: QuoteWithCreator; images: ImagePaths }) {
  return (
    <div className="w-[210mm] h-[297mm] mx-auto relative overflow-hidden">
      {/* Hero background photo */}
      <div className="absolute inset-0">
        <img
          src={images.poolHero}
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
            <img src="/Sunset.png" alt="Rentmil" className="h-20 object-contain" />
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
              src={images.maskotHolding}
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

// Intro page - personal letter from the company director
function IntroPage({ quote }: { quote: QuoteWithCreator }) {
  const salutation = quote.customer_salutation || `Vážený/á ${quote.customer_name}`
  const isFemale = salutation.startsWith('Vážená')
  const projevVerb = isFemale ? 'projevila' : 'projevil'

  return (
    <div className="w-[210mm] mx-auto bg-white relative flex flex-col py-12 px-10" style={{ minHeight: '260mm' }}>
      {/* Letter content */}
      <div className="flex-1 flex flex-col">
        {/* Salutation */}
        <div className="mt-4 mb-8">
          <h2 className="text-2xl font-bold text-[#01384B]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {salutation},
          </h2>
        </div>

        {/* Letter body */}
        <div className="space-y-5 text-[15px] leading-relaxed text-gray-700 max-w-[150mm]" style={{ fontFamily: 'Nunito, sans-serif' }}>
          <p>
            moc si vážím Vašeho zájmu a důvěry, kterou jste nám {projevVerb}.
          </p>

          <p>
            Bazén není jen stavba na zahradě. Je to místo, kde se zastavíte,
            vydechnete a necháte svět kolem sebe zpomalit.
            Místo Vašeho osobního <strong className="text-[#01384B]">zenu</strong>.
          </p>

          <p>
            A přesně to Vám chceme pomoci vytvořit.
          </p>

          <p>
            Bazény vyrábím přes dvacet let. Za tu dobu jsem poznal, že nejdůležitější
            není jen kvalitní materiál nebo precizní výroba — i když na tom si zakládáme.
            Nejdůležitější je pocit, že se o Vás někdo stará. Že máte po ruce člověka,
            který ví, co dělá, a na kterého se můžete spolehnout.
          </p>

          <p>
            Od prvního telefonátu až po chvíli, kdy poprvé vstoupíte do svého nového
            bazénu, <strong className="text-[#01384B]">budeme Vaším průvodcem</strong>.
            Postaráme se, aby vše proběhlo hladce — bez starostí a bez komplikací.
          </p>

          <p className="text-lg font-semibold text-[#01384B] italic">
            Vy zenujete, my bazénujeme.
          </p>

          <p>
            Těším se, až společně vytvoříme Váš bazénový zen.
          </p>
        </div>

        {/* Signature */}
        <div className="mt-10 flex items-end justify-between">
          <div>
            <p className="text-gray-500 text-sm mb-3">S přátelským pozdravem,</p>
            <p className="text-xl font-bold text-[#01384B]" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Drahoslav Houška
            </p>
            <p className="text-sm text-gray-500 mt-1">jednatel Rentmil s.r.o.</p>
          </div>

          {/* Mascot */}
          <img
            src="/maskot-thinking.png"
            alt="Bazénový mistr"
            className="h-72 object-contain opacity-90"
          />
        </div>

        {/* Decorative divider */}
        <div className="mt-auto pb-10">
          <div className="w-24 h-1 bg-gradient-to-r from-[#FF8621] to-[#ED6663] rounded-full" />
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
                  <div key={item.id} className="px-4 py-1.5 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-[#01384B] text-sm">{item.name}</p>
                      {item.description && !item.description.match(/^\[SA:[^\]]+\]$/) && (
                        <p className="text-xs text-gray-500 leading-snug mt-0.5 whitespace-pre-line">{item.description.replace(/^\[SA:[^\]]+\]\s*/, '')}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      {item.category === 'doprava' && item.total_price === 0 ? (
                        <p className="font-semibold text-green-600 text-sm">Zdarma</p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-500">
                            {item.quantity} {item.unit} × {formatPrice(item.unit_price)}
                          </p>
                          <p className="font-semibold text-[#01384B] text-sm">{formatPrice(item.total_price)}</p>
                        </>
                      )}
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
          <h2 className="text-2xl font-bold text-[#01384B]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {variant.variant_name}{!variant.variant_name.toLowerCase().includes('varianta') && ' varianta'}
          </h2>
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

// Czech month locative (6. pád) for "V lednu", "V dubnu" etc.
const MONTH_LOCATIVE: Record<string, string> = {
  'leden': 'lednu', 'únor': 'únoru', 'březen': 'březnu', 'duben': 'dubnu',
  'květen': 'květnu', 'červen': 'červnu', 'červenec': 'červenci', 'srpen': 'srpnu',
  'září': 'září', 'říjen': 'říjnu', 'listopad': 'listopadu', 'prosinec': 'prosinci',
}

function monthToLocative(capacityMonth: string): string {
  const parts = capacityMonth.trim().split(/\s+/)
  const monthName = parts[0]?.toLowerCase() || ''
  const rest = parts.slice(1).join(' ')
  const locative = MONTH_LOCATIVE[monthName] || monthName
  return rest ? `${locative} ${rest}` : locative
}

// Czech pluralization for "montáž": 1 volnou montáž, 2-4 volné montáže, 5+ volných montáží
function pluralizeMontaz(n: number): string {
  if (n === 1) return `${n} volnou montáž`
  if (n >= 2 && n <= 4) return `${n} volné montáže`
  return `${n} volných montáží`
}

// Closing page - 7 důvodů pro Rentmil + obchodní podmínky
function ClosingPage({ quote }: { quote: QuoteWithCreator }) {
  const validUntil = quote.valid_until
    ? new Date(quote.valid_until)
    : new Date(new Date(quote.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)

  const reasons = [
    { title: '24 let výroby, 2 000+ bazénů po celé ČR', desc: 'Přímý český výrobce od roku 2002' },
    { title: 'Prémiový německý materiál Polystone P', desc: 'UV stabilizovaný plast Röchling — životnost 20 let' },
    { title: 'Showroom v Plzni s reálnými bazény', desc: 'Přijďte si prohlédnout — Lidická 1233/26, Plzeň' },
    { title: 'Kompletní servis po celý rok', desc: 'Zprovoznění, údržba, zazimování — záruční i pozáruční' },
    { title: 'Autorizovaný partner Alukov zastřešení', desc: 'Oficiální dodavatel a partner evropského lídra s bazénovým zastřešením' },
    { title: 'Realizace na klíč od návrhu po instalaci', desc: 'Výroba, doprava, montáž — vše zařídíme za vás' },
    { title: 'Zákazníci nás doporučují dál', desc: 'Oceňují osobní přístup, odborné poradenství a spolehlivost v každém kroku' },
  ]

  return (
    <div className="w-[210mm] mx-auto bg-white px-10 pt-6 pb-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[#48A9A6] text-xs font-semibold uppercase tracking-widest mb-1">Proč právě my?</p>
        <h2 className="text-3xl font-bold text-[#01384B]" style={{ fontFamily: 'Nunito, sans-serif' }}>7 důvodů pro Rentmil</h2>
      </div>

      {/* Two column layout */}
      <div className="flex gap-8 mb-6">
        {/* Left column - 7 důvodů */}
        <div className="flex-1">
          {reasons.map((reason, index) => (
            <div key={index}>
              <div className="py-3.5">
                <p className="font-bold text-[#01384B] text-sm">
                  <span className="text-[#48A9A6] mr-1">{index + 1}.</span> {reason.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">{reason.desc}</p>
              </div>
              {index < reasons.length - 1 && <div className="h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Right column - Conditions card */}
        <div className="w-[240px] flex-shrink-0">
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3">
              <h3 className="text-sm font-bold text-[#48A9A6]">Obchodní podmínky v kostce</h3>
            </div>
            <div className="px-4 pb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Ceny</span>
                <span className="font-semibold text-[#01384B]">bez DPH</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Záruka konstrukce</span>
                <span className="font-semibold text-[#48A9A6]">10 let</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Záruka technologie</span>
                <span className="font-semibold text-[#01384B]">2 roky</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Materiál</span>
                <span className="font-semibold text-[#01384B]">Polystone P (Röchling)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Dodání</span>
                <span className="font-semibold text-[#01384B]">4–8 týdnů</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Záloha</span>
                <span className="font-semibold text-[#01384B]">50 %</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Doplatek</span>
                <span className="font-semibold text-[#01384B]">50 % před expedicí</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Doprava</span>
                <span className="font-semibold text-[#01384B]">Do 100 km od Plzně zdarma</span>
              </div>
            </div>
          </div>

          {/* Validity box */}
          <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Platnost nabídky</p>
            <p className="text-lg font-bold text-[#01384B]">{formatDate(validUntil.toISOString())}</p>
          </div>

          {/* Link to full terms */}
          <div className="mt-3 text-center">
            <a href="https://www.rentmil.cz/obchodni-podminky" className="text-[#48A9A6] text-[10px]">
              Kompletní obchodní podmínky →
            </a>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 py-5 border-y border-gray-200 mb-5">
        <div className="text-center">
          <p className="text-4xl font-bold text-[#48A9A6]">24</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Let zkušeností</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-[#48A9A6]">10</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Let záruka</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-[#48A9A6]">2000+</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Realizací po celé ČR</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-[#48A9A6]">4–8</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Týdnů dodání</p>
        </div>
      </div>

      {/* Urgency banner */}
      {(quote.order_deadline || quote.delivery_deadline) && (() => {
        const orderDeadlineFormatted = quote.order_deadline
          ? new Date(quote.order_deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
          : null
        const deliveryDeadlineFormatted = quote.delivery_deadline
          ? new Date(quote.delivery_deadline).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
          : null
        return (
          <div className="bg-gradient-to-r from-[#FF8621]/10 to-[#ED6663]/10 border border-[#FF8621]/30 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-[#01384B] text-base mb-1">Zajistěte si koupání na vlastní zahradě</p>
                {orderDeadlineFormatted && deliveryDeadlineFormatted && (
                  <p className="text-sm text-[#01384B]">
                    Při objednání do <strong>{orderDeadlineFormatted}</strong> je velmi pravděpodobné dodání do <strong>{deliveryDeadlineFormatted}</strong>.
                  </p>
                )}
                {orderDeadlineFormatted && !deliveryDeadlineFormatted && (
                  <p className="text-sm text-[#01384B]">
                    Objednejte do <strong>{orderDeadlineFormatted}</strong>
                  </p>
                )}
              </div>
              {quote.capacity_month && quote.available_installations != null && (
                <div className="bg-gradient-to-r from-[#FF8621] to-[#ED6663] rounded-xl px-5 py-3 text-white text-center ml-4 shadow-lg flex-shrink-0">
                  <p className="text-sm font-bold leading-snug whitespace-nowrap">V {monthToLocative(quote.capacity_month)} máme<br />ještě {pluralizeMontaz(quote.available_installations)}</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

    </div>
  )
}

// Next steps page - reviews, timeline, CTA (last page in document)
function NextStepsPage({ quote, images }: { quote: QuoteWithCreator; images: ImagePaths }) {
  const creatorName = quote.creator?.full_name || 'Rentmil tým'
  const creatorPhone = quote.creator?.phone || COMPANY.phone

  return (
    <div className="w-[210mm] mx-auto bg-white px-10 pt-4 pb-2">
      {/* Reviews section */}
      <div className="border border-gray-200 rounded-xl p-5 mb-5">
        <h3 className="text-sm font-bold text-[#01384B] uppercase tracking-wider mb-4">
          Co říkají naši zákazníci
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex gap-0.5 mb-2">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="text-[#FF8621] text-sm">&#9733;</span>
              ))}
            </div>
            <p className="text-sm text-[#01384B] italic leading-relaxed">
              &bdquo;Výborná spolupráce od první návštěvy. Bazén dodán v domluveném termínu, usazení, montáž, vše proběhlo na jedničku. Firma rovněž poskytuje nadstandardní servis.&ldquo;
            </p>
            <p className="text-xs text-gray-500 mt-2">&mdash; Lukáš Wilhelm</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex gap-0.5 mb-2">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="text-[#FF8621] text-sm">&#9733;</span>
              ))}
            </div>
            <p className="text-sm text-[#01384B] italic leading-relaxed">
              &bdquo;Názorné centrum s ukázkou téměř celého sortimentu. Ujmou se vás velmi ochotně a poradí s tím, co přesně potřebujete. Objednávku pak splní přesně podle slibu.&ldquo;
            </p>
            <p className="text-xs text-gray-500 mt-2">&mdash; Vladimír Dolejš</p>
          </div>
        </div>

        {/* Google rating */}
        <div className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
          {/* Google "G" logo */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-lg font-bold text-[#01384B]">4,6</span>
          <div className="flex items-center gap-0.5">
            {[1,2,3,4].map(i => (
              <span key={i} className="text-[#FF8621] text-sm leading-none">&#9733;</span>
            ))}
            <span className="text-sm leading-none relative">
              <span className="text-[#D1D5DB]">&#9733;</span>
              <span className="absolute inset-0 overflow-hidden w-[60%] text-[#FF8621]">&#9733;</span>
            </span>
          </div>
          <span className="text-xs text-gray-500">50+ recenzí</span>
          <a href="https://www.google.com/maps/place/Rentmil+s.r.o.+-+v%C3%BDroba+baz%C3%A9n%C5%AF/@49.7666927,13.3745379,17z" className="text-xs text-[#48A9A6] font-medium ml-2">
            Zobrazit všechny recenze &rarr;
          </a>
        </div>
      </div>

      {/* Timeline section */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-[#01384B] uppercase tracking-wider mb-5">
          Jak probíhá realizace
        </h3>

        <div className="flex items-start justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200" />

          {[
            { num: '1', title: 'Objednání', desc: 'Podpis smlouvy\na záloha 50 %', time: 'Den 0', color: '#8CC5C3' },
            { num: '2', title: 'Výroba', desc: 'Bazén na míru\nv naší dílně', time: '4–8 týdnů', color: '#6BB5B2' },
            { num: '3', title: 'Dodání', desc: 'Transport\nna vaši adresu', time: '1 den', color: '#48A9A6' },
            { num: '4', title: 'Instalace', desc: 'Osazení a napojení\ntechnologie', time: '2–3 dny', color: '#3A8B88' },
            { num: '✓', title: 'Předání', desc: 'Zaškolení\na užívání', time: 'Hotovo!', color: '#2D6E6B', isLast: true },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center relative z-10 w-1/5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mb-2"
                style={{ backgroundColor: step.color }}
              >
                {step.num}
              </div>
              <p className="font-bold text-[#01384B] text-xs mb-0.5">{step.title}</p>
              <p className="text-[10px] text-gray-500 whitespace-pre-line leading-tight">{step.desc}</p>
              <p className={`text-[10px] font-semibold mt-1 ${step.isLast ? 'text-[#FF8621]' : 'text-[#48A9A6]'}`}>
                {step.time}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0">
          <img src={images.poolHero} alt="Bazén" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#01384B]/95 via-[#01384B]/90 to-[#01384B]/75" />
        </div>

        <div className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Stačí 3 kroky k vašemu bazénu
              </h3>
              <p className="text-white/70 text-sm mb-4">Ozvěte se a vše zařídíme za vás</p>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#48A9A6] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
                  <p className="text-white text-sm">Zavolejte nám nebo napište</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#48A9A6] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
                  <p className="text-white text-sm">Probereme detaily a upravíme nabídku</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#48A9A6] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">3</div>
                  <p className="text-white text-sm">Podepíšeme smlouvu a <span className="text-[#48A9A6] font-semibold italic">zahájíme výrobu</span></p>
                </div>
              </div>

              {/* Contact box with creator info */}
              <div className="bg-gradient-to-r from-[#FF8621] to-[#ED6663] rounded-xl px-5 py-4 inline-block">
                <div className="mb-2">
                  <p className="text-white font-bold text-sm">{creatorName}</p>
                  <p className="text-white/80 text-[10px]">Váš bazénový specialista</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-white font-bold text-lg">{creatorPhone}</p>
                  <p className="text-white/90 text-xs">{COMPANY.email}</p>
                </div>
              </div>
            </div>

            {/* Mascot + slogan */}
            <div className="flex flex-col items-center ml-4">
              <img src={images.maskot} alt="Maskot" className="h-36 object-contain drop-shadow-2xl mb-2" />
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                <p className="text-sm font-semibold text-white italic" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  &bdquo;Vy zenujete, my bazénujeme.&ldquo;
                </p>
              </div>
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
  const { page, variant, token, quality } = await searchParams

  // Verify print token - required for all requests
  const tokenResult = verifyPrintToken(token, id, 'quote')
  if (!tokenResult.valid) {
    notFound() // Return 404 to not leak info about existence
  }

  const quote = await getQuote(id)

  if (!quote) {
    notFound()
  }

  // Select images based on quality (default to email/optimized)
  const images = IMAGE_PATHS[quality === 'print' ? 'print' : 'email']

  const hasVariants = quote.variants && quote.variants.length > 0

  // Render only title page
  if (page === 'title') {
    return (
      <div className="min-h-screen bg-white">
        <TitlePage quote={quote} images={images} />
      </div>
    )
  }

  // Render intro page (personal letter)
  if (page === 'intro') {
    return (
      <div className="min-h-screen bg-white">
        <IntroPage quote={quote} />
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

  // Render closing page (7 důvodů)
  if (page === 'closing') {
    return (
      <div className="min-h-screen bg-white">
        <ClosingPage quote={quote} />
      </div>
    )
  }

  // Render next steps page (reviews, timeline, CTA) - last page
  if (page === 'nextsteps') {
    return (
      <div className="min-h-screen bg-white">
        <NextStepsPage quote={quote} images={images} />
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
        <TitlePage quote={quote} images={images} />
        <IntroPage quote={quote} />
        {orderedVariants.map((v) => (
          <div key={v.id} className="w-[210mm] mx-auto bg-white py-12 px-10" style={{ pageBreakBefore: 'always' }}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#48A9A6]">
              <img src="/Sunset.png" alt="Rentmil" className="h-20 object-contain" />
              <p className="text-lg font-semibold text-[#01384B]">{quote.quote_number}</p>
            </div>
            <VariantContentPages quote={quote} variant={v} />
            <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 mt-8">
              <p>{COMPANY_FOOTER_FULL}</p>
            </div>
          </div>
        ))}
        {/* Comparison page */}
        <div className="w-[210mm] mx-auto bg-white py-12 px-10" style={{ pageBreakBefore: 'always' }}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#48A9A6]">
            <img src="/Sunset.png" alt="Rentmil" className="h-20 object-contain" />
            <p className="text-lg font-semibold text-[#01384B]">{quote.quote_number}</p>
          </div>
          <ComparisonPage quote={quote} />
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 mt-8">
            <p>{COMPANY_FOOTER_FULL}</p>
          </div>
        </div>
      </div>
    )
  }

  // Classic single-page view (no variants)
  return (
    <div className="min-h-screen bg-white">
      <TitlePage quote={quote} images={images} />
      <IntroPage quote={quote} />
      <div className="w-[210mm] mx-auto bg-white py-12 px-10" style={{ pageBreakBefore: 'always' }}>
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#48A9A6]">
          <img src="/Sunset.png" alt="Rentmil" className="h-20 object-contain" />
          <p className="text-lg font-semibold text-[#01384B]">{quote.quote_number}</p>
        </div>
        <ContentPages quote={quote} />
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 mt-8">
          <p>{COMPANY_FOOTER_FULL}</p>
        </div>
      </div>
    </div>
  )
}
