import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Order, OrderItem, QuoteItemCategory, PoolDimensions } from '@/lib/supabase/types'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

interface PoolConfig {
  shape?: string
  type?: string
  dimensions?: PoolDimensions
  color?: string
  stairs?: string
  technology?: string | string[]
  heating?: string
  roofing?: string
}

const CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  bazeny: 'Bazény',
  prislusenstvi: 'Příslušenství',
  sluzby: 'Služby',
  prace: 'Práce',
  doprava: 'Doprava',
  jine: 'Jiné',
}

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
    <div className="min-h-screen bg-gradient-to-br from-[#01384B] via-[#025a6e] to-[#48A9A6] flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#48A9A6]/20 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 mb-12">
        <img
          src="/logo-transparent.svg"
          alt="Rentmil"
          className="h-24 w-auto brightness-0 invert"
        />
      </div>

      {/* Title */}
      <h1 className="relative z-10 text-5xl font-bold mb-4 text-center">
        KUPNÍ SMLOUVA
      </h1>
      <p className="relative z-10 text-2xl text-white/80 mb-8">
        č. {order.order_number}
      </p>

      {/* Customer info */}
      <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4 text-white/90">Kupující</h2>
        <p className="text-2xl font-bold mb-2">{order.customer_name}</p>
        {order.customer_address && (
          <p className="text-white/70">{order.customer_address}</p>
        )}
        {order.customer_ico && (
          <p className="text-white/70 mt-2">IČO: {order.customer_ico}</p>
        )}
      </div>

      {/* Price highlight */}
      <div className="relative z-10 mt-8 text-center">
        <p className="text-white/60 text-sm mb-1">Celková cena</p>
        <p className="text-4xl font-bold">{formatPrice(order.total_price)}</p>
      </div>

      {/* Date */}
      <div className="relative z-10 mt-12 text-white/60 text-sm">
        Vystaveno: {formatDate(order.created_at)}
      </div>

      {/* Slogan */}
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <p className="text-xl font-semibold text-white/90 italic">
          „Vy zenujete, my bazénujeme."
        </p>
      </div>
    </div>
  )
}

// Contract content page
function ContractPage({ order }: { order: Order & { items: OrderItem[] } }) {
  const config = order.pool_config as PoolConfig | null

  return (
    <div className="min-h-screen bg-white p-8 text-[#01384B]">
      {/* Header - will be added by Puppeteer */}
      <div className="h-4" />

      {/* Contract parties */}
      <div className="mb-8">
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

      {/* Pool specification */}
      {config && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#48A9A6]">
            Předmět smlouvy - Specifikace bazénu
          </h2>
          <div className="bg-[#f8fafb] p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              {config.shape && (
                <div>
                  <p className="text-xs text-gray-500">Tvar</p>
                  <p className="font-semibold">{getShapeLabel(config.shape)}</p>
                </div>
              )}
              {config.type && (
                <div>
                  <p className="text-xs text-gray-500">Typ</p>
                  <p className="font-semibold">{getTypeLabel(config.type)}</p>
                </div>
              )}
              {config.dimensions && (
                <div>
                  <p className="text-xs text-gray-500">Rozměry</p>
                  <p className="font-semibold">
                    {formatDimensions(config.shape || '', config.dimensions)}
                  </p>
                </div>
              )}
              {config.color && (
                <div>
                  <p className="text-xs text-gray-500">Barva</p>
                  <p className="font-semibold">{getColorLabel(config.color)}</p>
                </div>
              )}
              {config.stairs && config.stairs !== 'none' && (
                <div>
                  <p className="text-xs text-gray-500">Schodiště</p>
                  <p className="font-semibold">{getStairsLabel(config.stairs)}</p>
                </div>
              )}
              {config.technology && (
                <div>
                  <p className="text-xs text-gray-500">Technologie</p>
                  <p className="font-semibold">
                    {Array.isArray(config.technology)
                      ? config.technology.map(t => getTechnologyLabel(t)).join(', ')
                      : getTechnologyLabel(config.technology)}
                  </p>
                </div>
              )}
              {config.heating && config.heating !== 'none' && (
                <div>
                  <p className="text-xs text-gray-500">Ohřev</p>
                  <p className="font-semibold">{getHeatingLabel(config.heating)}</p>
                </div>
              )}
              {config.roofing && config.roofing !== 'none' && (
                <div>
                  <p className="text-xs text-gray-500">Zastřešení</p>
                  <p className="font-semibold">{getRoofingLabel(config.roofing)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        <div className="mt-4 flex justify-end">
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
            <div className="flex justify-between py-2 mt-2 border-t-2 border-[#01384B] font-bold text-lg">
              <span>CELKEM</span>
              <span>{formatPrice(order.total_price)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment terms */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#48A9A6]">
          Platební podmínky
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#48A9A6]/10 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Záloha (50%)</p>
            <p className="text-xl font-bold text-[#01384B]">
              {formatPrice(order.deposit_amount > 0 ? order.deposit_amount : order.total_price * 0.5)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Splatná při podpisu smlouvy</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Doplatek</p>
            <p className="text-xl font-bold text-[#01384B]">
              {formatPrice(order.total_price - (order.deposit_amount > 0 ? order.deposit_amount : order.total_price * 0.5))}
            </p>
            <p className="text-xs text-gray-500 mt-1">Splatný při předání</p>
          </div>
          <div className="bg-[#01384B] p-4 rounded-lg text-center text-white">
            <p className="text-sm text-white/70 mb-1">Celkem k úhradě</p>
            <p className="text-xl font-bold">{formatPrice(order.total_price)}</p>
            <p className="text-xs text-white/60 mt-1">Včetně DPH</p>
          </div>
        </div>
      </div>

      {/* Delivery */}
      {(order.delivery_date || order.delivery_address) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-[#48A9A6]">
            Dodání
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            {order.delivery_date && (
              <div className="mb-2">
                <span className="text-gray-600">Plánované datum dodání: </span>
                <span className="font-semibold">{formatDate(order.delivery_date)}</span>
              </div>
            )}
            {order.delivery_address && (
              <div>
                <span className="text-gray-600">Adresa dodání: </span>
                <span className="font-semibold">{order.delivery_address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mb-8">
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

// Terms page
function TermsPage({ order }: { order: Order }) {
  return (
    <div className="min-h-screen bg-white p-8 text-[#01384B]">
      <div className="h-4" />

      <h2 className="text-xl font-bold mb-6 pb-2 border-b-2 border-[#48A9A6]">
        Obchodní podmínky
      </h2>

      <div className="text-sm leading-relaxed space-y-4">
        <div>
          <h3 className="font-bold mb-2">1. Předmět smlouvy</h3>
          <p className="text-gray-700">
            Prodávající se zavazuje dodat kupujícímu bazén a příslušenství dle specifikace uvedené v této smlouvě a kupující se zavazuje zaplatit kupní cenu.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">2. Kupní cena a platební podmínky</h3>
          <p className="text-gray-700">
            Kupní cena je stanovena dohodou smluvních stran a je uvedena v této smlouvě včetně DPH.
            Záloha ve výši 50% kupní ceny je splatná při podpisu smlouvy.
            Doplatek je splatný při předání díla.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">3. Dodací lhůta</h3>
          <p className="text-gray-700">
            Standardní dodací lhůta je 4-8 týdnů od uhrazení zálohy, není-li dohodnuto jinak.
            Prodávající informuje kupujícího o přesném termínu dodání minimálně 5 pracovních dní předem.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">4. Místo dodání</h3>
          <p className="text-gray-700">
            Místem dodání je adresa uvedená v této smlouvě. Kupující zajistí přístup k místu instalace.
            Cena nezahrnuje zemní práce a přípravu podloží, není-li uvedeno jinak.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">5. Záruční podmínky</h3>
          <p className="text-gray-700">
            Na bazénovou konstrukci poskytuje prodávající záruku 10 let.
            Na bazénovou technologii a příslušenství je poskytována záruka 2 roky.
            Záruka se nevztahuje na poškození způsobené nesprávným užíváním nebo údržbou.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">6. Odstoupení od smlouvy</h3>
          <p className="text-gray-700">
            V případě odstoupení od smlouvy ze strany kupujícího po zahájení výroby má prodávající
            nárok na úhradu nákladů spojených s již provedenými pracemi, maximálně však ve výši zálohy.
          </p>
        </div>

        <div>
          <h3 className="font-bold mb-2">7. Závěrečná ustanovení</h3>
          <p className="text-gray-700">
            Tato smlouva je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží jeden.
            Smlouva nabývá platnosti a účinnosti dnem podpisu oběma smluvními stranami.
          </p>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div>
          <p className="text-sm text-gray-600 mb-2">Za prodávajícího:</p>
          <div className="border-b-2 border-[#01384B] h-16" />
          <p className="text-sm mt-2">Rentmil s.r.o.</p>
          <p className="text-xs text-gray-500">
            V Plzni dne {order.contract_date ? formatDate(order.contract_date) : '________________'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Za kupujícího:</p>
          <div className="border-b-2 border-[#01384B] h-16" />
          <p className="text-sm mt-2">{order.customer_name}</p>
          <p className="text-xs text-gray-500">
            V ________________ dne ________________
          </p>
        </div>
      </div>

      {/* Company stamp placeholder */}
      <div className="mt-8 text-center text-xs text-gray-400">
        (Prostor pro razítka)
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
