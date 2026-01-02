import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Order, OrderItem, QuoteItemCategory } from '@/lib/supabase/types'
import { QUOTE_CATEGORY_LABELS } from '@/lib/constants/categories'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

const CATEGORY_LABELS = QUOTE_CATEGORY_LABELS

async function getOrder(id: string) {
  const supabase = await createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return null
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('sort_order', { ascending: true })

  return {
    ...order,
    items: items || [],
  } as Order & { items: OrderItem[] }
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

// Title page component
function TitlePage({ order }: { order: Order & { items: OrderItem[] } }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero background photo */}
      <div className="absolute inset-0">
        <img src="/pool-hero.jpg" alt="Bazén Rentmil" className="w-full h-full object-cover" />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#01384B]/80 via-[#01384B]/50 to-[#01384B]/90" />
      </div>

      {/* Top section - Logo and contract number */}
      <div className="relative z-10 p-10 flex items-start justify-between">
        {/* Logo */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
          <img
            src="/logo-transparent.svg"
            alt="Rentmil"
            className="h-20 object-contain"
          />
        </div>

        {/* Contract info badge */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 text-right">
          <p className="text-[#48A9A6] text-sm font-medium uppercase tracking-wider mb-1">Smlouva o dílo č.</p>
          <p className="text-3xl font-bold text-white">{order.order_number}</p>
          <p className="text-white/70 text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>
      </div>

      {/* Center section - Main title */}
      <div className="relative z-10 flex flex-col items-center justify-center mt-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg uppercase tracking-wide">
            Smlouva o dílo
          </h1>
          <p className="text-2xl text-white/90 mb-6 drop-shadow">
            Váš vysněný bazén je na cestě
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-[#FF8621] to-[#ED6663] mx-auto rounded-full mb-8" />

          {/* Customer name highlight */}
          <div className="inline-block">
            <p className="text-white/80 text-lg mb-2 drop-shadow">Objednatel</p>
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-8 py-4 border border-white/30">
              <p className="text-3xl font-bold text-white drop-shadow-lg">{order.customer_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Customer details and slogan */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="flex items-end justify-between">
          {/* Mascot */}
          <div className="relative">
            <img
              src="/maskot-holding-hq.png"
              alt="Bazénový mistr"
              className="h-72 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Customer info card + Slogan */}
          <div className="flex flex-col items-end gap-6">
            {/* Customer info card - no price */}
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs">
              <h3 className="text-[#48A9A6] text-sm font-semibold uppercase tracking-wider mb-3">
                Objednatel
              </h3>
              <div className="space-y-1.5">
                <p className="text-lg font-bold text-[#01384B]">{order.customer_name}</p>
                {order.customer_email && (
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-[#48A9A6]">email:</span> {order.customer_email}
                  </p>
                )}
                {order.customer_phone && (
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-[#48A9A6]">tel:</span> {order.customer_phone}
                  </p>
                )}
                {order.customer_address && (
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-[#48A9A6]">adresa:</span> {order.customer_address}
                  </p>
                )}
              </div>
            </div>

            {/* Slogan */}
            <div className="text-right">
              <p className="text-2xl font-semibold text-white italic drop-shadow-lg">&bdquo;Vy zenujete, my bazénujeme.&ldquo;</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Contract content page
function ContractPage({ order }: { order: Order & { items: OrderItem[] } }) {
  return (
    <div className="min-h-screen bg-white p-8 text-[#01384B]">
      {/* Header - will be added by Puppeteer */}
      <div className="h-4" />

      {/* Contract parties */}
      <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#48A9A6]">
          Smluvní strany
        </h2>

        <div className="grid grid-cols-2 gap-8">
          {/* Seller */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-[#48A9A6] mb-2">Prodávající</h3>
            <p className="font-bold">Rentmil s.r.o.</p>
            <p className="text-sm text-gray-600">Lidická 1233/26</p>
            <p className="text-sm text-gray-600">323 00 Plzeň</p>
            <p className="text-sm text-gray-600 mt-2">IČO: 12345678</p>
            <p className="text-sm text-gray-600">DIČ: CZ12345678</p>
          </div>

          {/* Buyer */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-[#48A9A6] mb-2">Kupující</h3>
            <p className="font-bold">{order.customer_name}</p>
            {order.customer_address && (
              <p className="text-sm text-gray-600">{order.customer_address}</p>
            )}
            {order.customer_ico && (
              <p className="text-sm text-gray-600 mt-2">IČO: {order.customer_ico}</p>
            )}
            {order.customer_dic && (
              <p className="text-sm text-gray-600">DIČ: {order.customer_dic}</p>
            )}
            {order.customer_email && (
              <p className="text-sm text-gray-600 mt-2">{order.customer_email}</p>
            )}
            {order.customer_phone && (
              <p className="text-sm text-gray-600">{order.customer_phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#48A9A6]">
          Položky objednávky
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#01384B] text-white">
              <th className="py-2 px-3 text-left rounded-tl-lg">Položka</th>
              <th className="py-2 px-3 text-left">Kategorie</th>
              <th className="py-2 px-3 text-center">Množství</th>
              <th className="py-2 px-3 text-right">Cena/ks</th>
              <th className="py-2 px-3 text-right rounded-tr-lg">Celkem</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr
                key={item.id}
                className={index % 2 === 1 ? 'bg-gray-50' : ''}
              >
                <td className="py-2 px-3 font-medium">{item.name}</td>
                <td className="py-2 px-3">
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {CATEGORY_LABELS[item.category as QuoteItemCategory]}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-2 px-3 text-right">{formatPrice(item.unit_price)}</td>
                <td className="py-2 px-3 text-right font-semibold">
                  {formatPrice(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end" style={{ pageBreakInside: 'avoid' }}>
          <div className="w-64">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Mezisoučet</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_percent > 0 && (
              <div className="flex justify-between py-1 text-sm text-green-600">
                <span>Sleva ({order.discount_percent}%)</span>
                <span>-{formatPrice(order.subtotal * (order.discount_percent / 100))}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between py-1 text-sm text-green-600">
                <span>Sleva</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="rounded-lg border-2 border-[#01384B] p-3 bg-[#01384B]/5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-[#01384B]">Celkem k úhradě</span>
                <span className="text-2xl font-bold text-[#01384B]">{formatPrice(order.total_price)}</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">včetně DPH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#48A9A6]">
            Poznámky
          </h2>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Terms page - poslední stránka s termíny, zárukami, podpisy a GDPR
// Kompaktní design aby se vešla na 1 stránku, bez vlastního headeru (Puppeteer přidá header)
function TermsPage({ order }: { order: Order }) {
  const depositAmount = order.deposit_amount > 0 ? order.deposit_amount : order.total_price * 0.5
  const remainingAmount = order.total_price - depositAmount

  return (
    <div className="bg-white px-8 py-4 text-[#01384B]">
      {/* Termíny plnění */}
      <div className="mb-4" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-base font-bold text-[#01384B] mb-2 pb-1 border-b-2 border-[#01384B]">
          I. Termíny plnění
        </h2>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Dodací lhůta</p>
              <p className="font-semibold text-[#01384B]">6-8 týdnů od uhrazení zálohy</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Místo dodání</p>
              <p className="font-semibold text-[#01384B]">{order.delivery_address || order.customer_address || 'Dle dohody'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platební podmínky */}
      <div className="mb-4" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-base font-bold text-[#01384B] mb-2 pb-1 border-b-2 border-[#01384B]">
          II. Platební podmínky
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 border-2 border-[#48A9A6] rounded-lg text-center bg-[#48A9A6]/5">
            <p className="text-xs text-gray-500 mb-1">Záloha (50%)</p>
            <p className="text-xl font-bold text-[#01384B]">{formatPrice(depositAmount)}</p>
            <p className="text-xs text-gray-500">Splatná při podpisu</p>
          </div>
          <div className="p-3 border-2 border-gray-200 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">Doplatek</p>
            <p className="text-xl font-bold text-[#01384B]">{formatPrice(remainingAmount)}</p>
            <p className="text-xs text-gray-500">Splatný při předání</p>
          </div>
          <div className="p-3 bg-[#01384B] rounded-lg text-center text-white">
            <p className="text-xs text-white/70 mb-1">Celkem</p>
            <p className="text-xl font-bold">{formatPrice(order.total_price)}</p>
            <p className="text-xs text-white/60">Včetně DPH</p>
          </div>
        </div>
      </div>

      {/* Záruční podmínky */}
      <div className="mb-4" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-base font-bold text-[#01384B] mb-2 pb-1 border-b-2 border-[#01384B]">
          III. Záruční podmínky
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-[#48A9A6]/10 rounded-lg border-l-4 border-[#48A9A6]">
            <div className="text-2xl font-bold text-[#48A9A6]">10</div>
            <div>
              <p className="font-semibold text-[#01384B] text-sm">let záruka</p>
              <p className="text-xs text-gray-500">na bazénovou konstrukci</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border-l-4 border-gray-300">
            <div className="text-2xl font-bold text-[#01384B]">2</div>
            <div>
              <p className="font-semibold text-[#01384B] text-sm">roky záruka</p>
              <p className="text-xs text-gray-500">na technologii a příslušenství</p>
            </div>
          </div>
        </div>
      </div>

      {/* Podpisy smluvních stran */}
      <div className="mb-4" style={{ pageBreakInside: 'avoid' }}>
        <h2 className="text-base font-bold text-[#01384B] mb-2 pb-1 border-b-2 border-[#01384B]">
          IV. Podpisy smluvních stran
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 border-2 border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Za zhotovitele:</p>
            <div className="border-b-2 border-[#01384B] h-16 mb-2" />
            <p className="font-semibold text-[#01384B] text-sm">Rentmil s.r.o.</p>
            <p className="text-xs text-[#01384B]">Drahoslav Houška, jednatel</p>
            <p className="text-xs text-gray-600 mt-3">
              V Plzni dne {order.contract_date ? formatDate(order.contract_date) : formatDate(order.created_at)}
            </p>
          </div>
          <div className="p-4 border-2 border-[#48A9A6] rounded-lg bg-[#48A9A6]/5">
            <p className="text-xs text-[#48A9A6] mb-2">Za objednatele:</p>
            <div className="border-b-2 border-[#01384B] h-16 mb-2" />
            <p className="font-semibold text-[#01384B] text-sm">{order.customer_name}</p>
            <p className="text-xs text-gray-600 mt-3">V __________ dne __________</p>
          </div>
        </div>
      </div>

      {/* GDPR + Obchodní podmínky - kompaktní */}
      <div className="p-3 bg-gray-100 rounded-lg text-xs text-gray-600" style={{ pageBreakInside: 'avoid' }}>
        <p className="font-semibold mb-1">Ochrana osobních údajů a obchodní podmínky</p>
        <p className="leading-relaxed">
          Osobní údaje jsou zpracovávány společností Rentmil s.r.o. v souladu s GDPR (EU) 2016/679.
          Více na www.rentmil.cz/ochrana-osobnich-udaju.
          Podpisem této smlouvy souhlasíte s obchodními podmínkami na{' '}
          <a href="https://www.rentmil.cz/obchodni-podminky" className="text-[#48A9A6] underline">
            www.rentmil.cz/obchodni-podminky
          </a>
        </p>
      </div>
    </div>
  )
}

export default async function OrderPrintPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { page } = await searchParams
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  // Return specific page based on query param
  if (page === 'title') {
    return <TitlePage order={order} />
  }

  if (page === 'terms') {
    return <TermsPage order={order} />
  }

  // Default: contract content
  return <ContractPage order={order} />
}
