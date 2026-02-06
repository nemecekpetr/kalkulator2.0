import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Order, OrderItem } from '@/lib/supabase/types'
import { COMPANY } from '@/lib/constants/company'
import { verifyPrintToken } from '@/lib/pdf/print-token'
import { formatPrice, formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; token?: string; quality?: 'email' | 'print' }>
}

// Image paths type
interface ImagePaths {
  poolHero: string
  maskotHolding: string
}

// Image paths based on quality setting
const IMAGE_PATHS: Record<'email' | 'print', ImagePaths> = {
  email: {
    poolHero: '/print/pool-hero-print.jpg',
    maskotHolding: '/print/maskot-holding-print.png',
  },
  print: {
    poolHero: '/print/pool-hero-hq.jpg',
    maskotHolding: '/maskot-holding-hq.png',
  },
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

// Title page component
function TitlePage({ order, images }: { order: Order & { items: OrderItem[] }; images: ImagePaths }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero background photo */}
      <div className="absolute inset-0">
        <img src={images.poolHero} alt="Bazén Rentmil" className="w-full h-full object-cover" />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#01384B]/80 via-[#01384B]/50 to-[#01384B]/90" />
      </div>

      {/* Top section - Logo and contract number */}
      <div className="relative z-10 p-10 flex items-start justify-between">
        {/* Logo */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
          <img
            src="/Sunset.png"
            alt="Rentmil"
            className="h-20 object-contain"
          />
        </div>

        {/* Contract info badge */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 text-right">
          <p className="text-[#48A9A6] text-sm font-medium uppercase tracking-wider mb-1">Objednávka č.</p>
          <p className="text-3xl font-bold text-white">{order.order_number}</p>
          <p className="text-white/70 text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>
      </div>

      {/* Center section - Main title */}
      <div className="relative z-10 flex flex-col items-center justify-center mt-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg uppercase tracking-wide">
            Objednávka
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
              src={images.maskotHolding}
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

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  rentmil_dap: 'Rentmil s.r.o. (DAP)',
  self_pickup: 'Vlastní odběr',
}

function getDeliveryMethodLabel(method: string | null): string {
  if (!method) return 'Dle dohody'
  return DELIVERY_METHOD_LABELS[method] || method
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
            <p className="font-bold">{COMPANY.name}</p>
            <p className="text-sm text-gray-600">{COMPANY.address.street}</p>
            <p className="text-sm text-gray-600">{COMPANY.address.zip} {COMPANY.address.city}</p>
            <p className="text-sm text-gray-600 mt-2">IČO: {COMPANY.ico}</p>
            <p className="text-sm text-gray-600">DIČ: {COMPANY.dic}</p>
            <p className="text-sm text-gray-500 mt-1">{COMPANY.registration}</p>
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
                <td className="py-2 px-3 text-center">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-2 px-3 text-right">{formatPrice(item.unit_price)}</td>
                <td className="py-2 px-3 text-right font-semibold">
                  {formatPrice(item.total_price)}
                </td>
              </tr>
            ))}
            {/* Delivery row */}
            <tr className={order.items.length % 2 === 1 ? 'bg-gray-50' : ''}>
              <td className="py-2 px-3 font-medium">
                Doprava{order.delivery_method ? ` — ${getDeliveryMethodLabel(order.delivery_method)}` : ''}
              </td>
              <td className="py-2 px-3 text-center">1 ks</td>
              <td className="py-2 px-3 text-right">
                {order.delivery_cost_free || order.delivery_cost === 0 ? '' : formatPrice(order.delivery_cost)}
              </td>
              <td className="py-2 px-3 text-right font-semibold">
                {order.delivery_cost_free || order.delivery_cost === 0 ? (
                  <span className="text-green-600">Zdarma</span>
                ) : (
                  formatPrice(order.delivery_cost)
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end" style={{ pageBreakInside: 'avoid' }}>
          <div className="w-72">
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
            {(() => {
              const vatRate = order.vat_rate ?? 12
              const priceWithoutVat = Math.round(order.total_price / (1 + vatRate / 100))
              const vatAmount = order.total_price - priceWithoutVat
              return (
                <>
                  <div className="flex justify-between py-1 text-sm border-t border-gray-200 mt-1 pt-1">
                    <span className="text-gray-600">Cena bez DPH</span>
                    <span>{formatPrice(priceWithoutVat)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-600">DPH ({vatRate}%)</span>
                    <span>{formatPrice(vatAmount)}</span>
                  </div>
                </>
              )
            })()}
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

// Contract clauses page - 13 legal articles
function ContractClausesPage({ order }: { order: Order }) {
  const vatRate = order.vat_rate ?? 12
  const priceWithoutVat = Math.round(order.total_price / (1 + vatRate / 100))
  const vatAmount = order.total_price - priceWithoutVat
  const depositAmount = order.deposit_amount > 0 ? order.deposit_amount : Math.round(order.total_price / 2)
  const remainingAmount = order.total_price - depositAmount

  // Extract variable symbol from order number (digits only)
  const variableSymbol = order.order_number.replace(/\D/g, '')

  return (
    <div className="bg-white px-10 py-6 text-[#01384B] text-[11px] leading-relaxed">
      {/* Article 1 */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          1. Předmět smlouvy
        </h3>
        <p>
          Prodávající se zavazuje dodat Kupujícímu bazén a příslušenství dle specifikace uvedené
          v položkách této objednávky (dále jen &bdquo;zboží&ldquo;) a Kupující se zavazuje zboží
          převzít a zaplatit za něj sjednanou cenu. Specifikace zboží, jeho množství a cena jsou
          uvedeny v přiložené tabulce položek objednávky, která tvoří nedílnou součást této smlouvy.
        </p>
      </div>

      {/* Article 2 - dynamic */}
      <div className="mb-5">
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          2. Smluvní cena a platební podmínky
        </h3>
        <p className="mb-2">
          Celková cena za dodání zboží činí <strong className="text-sm">{formatPrice(order.total_price)}</strong> včetně {vatRate}% DPH
          (z toho cena bez DPH: {formatPrice(priceWithoutVat)}, DPH: {formatPrice(vatAmount)}).
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#48A9A6]/10 border border-[#48A9A6]/30 rounded-lg p-3" style={{ breakInside: 'avoid' }}>
            <p className="font-semibold text-[#01384B] text-xs mb-1">1. splátka (záloha)</p>
            <p className="text-base font-bold text-[#01384B]">{formatPrice(depositAmount)}</p>
            <p className="text-gray-600 mt-1">Splatná do 5 pracovních dní od podpisu objednávky</p>
            <p className="text-gray-600 mt-1">
              Č. účtu: <strong>{COMPANY.bank.accountNumber}</strong>
              {' '}{COMPANY.bank.name}
            </p>
            <p className="text-gray-600">
              Variabilní symbol: <strong>{variableSymbol}</strong>
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3" style={{ breakInside: 'avoid' }}>
            <p className="font-semibold text-[#01384B] text-xs mb-1">2. splátka (doplatek)</p>
            <p className="text-base font-bold text-[#01384B]">{formatPrice(remainingAmount)}</p>
            <p className="text-gray-600 mt-1">
              Splatná v den dodání zboží, případně 3 pracovní dny před plánovaným dodáním na základě výzvy Prodávajícího.
            </p>
          </div>
        </div>

        <p className="mb-1">
          Na dodávku se uplatní snížená sazba DPH dle §48 zákona č. 235/2004 Sb., o dani z přidané hodnoty,
          pokud jsou splněny zákonné podmínky (stavba pro bydlení).
        </p>
        <p>
          V případě nezaplacení zálohy ve stanovené lhůtě je Prodávající oprávněn od smlouvy odstoupit
          a požadovat náhradu vzniklých nákladů.
        </p>
      </div>

      {/* Article 3 - dynamic */}
      <div className="mb-5">
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          3. Místo a termín plnění
        </h3>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3" style={{ breakInside: 'avoid' }}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Místo plnění</p>
              <p className="font-semibold text-[#01384B] text-xs">
                {order.fulfillment_address || order.delivery_address || order.customer_address || 'Dle dohody'}
              </p>
            </div>
            {order.construction_readiness_date && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Stavební připravenost</p>
                <p className="font-semibold text-[#01384B] text-xs">{formatDate(order.construction_readiness_date)}</p>
              </div>
            )}
            {order.expected_delivery_date && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Předpokládané dodání</p>
                <p className="font-semibold text-[#01384B] text-xs">{formatDate(order.expected_delivery_date)}</p>
              </div>
            )}
          </div>
        </div>

        <p className="mb-1">
          Stavební připravenost zajišťuje Kupující na vlastní náklady. Konkrétní termín dodání
          oznámí Prodávající Kupujícímu nejméně 5 pracovních dní předem telefonicky nebo emailem.
        </p>
        <p>
          Dodací lhůta je {order.delivery_term || '4–8 týdnů'} od uhrazení zálohy. V případě nepříznivých
          klimatických podmínek nebo vyšší moci se termín dodání přiměřeně prodlužuje.
        </p>
      </div>

      {/* Article 4 - dynamic */}
      <div className="mb-5">
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          4. Způsob dodání, náklady na dodání
        </h3>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3" style={{ breakInside: 'avoid' }}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Způsob dopravy</p>
              <p className="font-semibold text-[#01384B] text-xs">{getDeliveryMethodLabel(order.delivery_method)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Náklady na dodání</p>
              <p className="font-semibold text-[#01384B] text-xs">
                {order.delivery_cost_free ? 'Zdarma' : formatPrice(order.delivery_cost)}
              </p>
            </div>
            {order.total_weight != null && order.total_weight > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Hmotnost</p>
                <p className="font-semibold text-[#01384B] text-xs">{order.total_weight} kg <span className="font-normal text-gray-500">(± 5%)</span></p>
              </div>
            )}
          </div>
        </div>

        <p>
          Vykládku zboží z přepravního vozidla zajišťuje Kupující na vlastní náklady a odpovědnost.
          K vykládce je třeba zajistit jeřáb nebo dostatečný počet osob (min. 1 osoba na 25 kg hmotnosti zboží).
          Prodávající neodpovídá za škody vzniklé při vykládce zajišťované Kupujícím.
        </p>
      </div>

      {/* Article 5 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          5. Změna objednávky
        </h3>
        <p>
          Kupující je oprávněn požádat o změnu objednávky (změna barvy, rozměrů, příslušenství apod.)
          pouze písemnou formou. Změna objednávky je účinná až po písemném potvrzení Prodávajícím.
          Prodávající si vyhrazuje právo na úpravu ceny a termínu dodání v případě změny objednávky.
          Pokud již byla zahájena výroba, může být změna objednávky zpoplatněna dle skutečně vynaložených nákladů.
        </p>
      </div>

      {/* Article 6 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          6. Rozsah plnění
        </h3>
        <p>
          Předmětem dodávky je výhradně zboží uvedené v položkách objednávky. Zemní práce, stavební
          příprava, elektroinstalace, vodoinstalace a další práce spojené s instalací bazénu nejsou
          součástí dodávky, pokud není výslovně uvedeno jinak. Montáž technologie je součástí dodávky
          pouze v případě, že je uvedena jako samostatná položka objednávky.
        </p>
      </div>

      {/* Article 7 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          7. Změna termínu dodání
        </h3>
        <p className="mb-1">
          Prodávající je oprávněn změnit termín dodání v případě:
        </p>
        <ul className="list-disc list-inside space-y-0.5 ml-2 mb-1">
          <li>nepříznivých klimatických podmínek znemožňujících přepravu nebo instalaci,</li>
          <li>vyšší moci (živelné pohromy, epidemie, válečné konflikty, výpadky dodavatelského řetězce),</li>
          <li>prodlení Kupujícího se zajištěním stavební připravenosti,</li>
          <li>nezaplacení zálohy nebo doplatku ve stanoveném termínu.</li>
        </ul>
        <p>
          O změně termínu je Prodávající povinen informovat Kupujícího bez zbytečného odkladu.
          Změna termínu dodání z výše uvedených důvodů nezakládá právo Kupujícího na odstoupení
          od smlouvy ani na náhradu škody.
        </p>
      </div>

      {/* Article 8 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          8. Součinnost Kupujícího
        </h3>
        <p className="mb-1">
          Kupující je povinen poskytnout Prodávajícímu veškerou součinnost potřebnou k řádnému plnění
          této smlouvy, zejména:
        </p>
        <ul className="list-disc list-inside space-y-0.5 ml-2 mb-1">
          <li>zajistit přístup na místo plnění pro nákladní vozidlo a mechanizaci,</li>
          <li>zajistit stavební připravenost dle pokynů Prodávajícího,</li>
          <li>být přítomen při předání zboží nebo pověřit zástupce k převzetí,</li>
          <li>zajistit přípojku elektrické energie (230V/400V) a přívod vody na místo instalace.</li>
        </ul>
        <p>
          V případě, že Kupující neposkytne potřebnou součinnost a pracovníci Prodávajícího budou
          nuceni čekat nebo se vrátit, je Prodávající oprávněn účtovat prostoje ve výši
          750 Kč + DPH za každou započatou hodinu čekání, včetně nákladů na opakovanou dopravu.
        </p>
      </div>

      {/* Article 9 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          9. Zajištění dodávky vody
        </h3>
        <p>
          Kupující zajistí na místě plnění dostatečný přívod čisté vody pro napuštění bazénu a zprovoznění
          technologie. Minimální potřebné množství vody je 2 000 litrů (pro účely testování, proplachování
          a prvního napuštění). Voda musí být přivedena hadicí k bazénu v den instalace.
          Náklady na vodu nese Kupující. Bez zajištění vody nelze provést zprovoznění technologie
          a zkušební provoz.
        </p>
      </div>

      {/* Article 10 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          10. Pracovní dny a pracovní doba
        </h3>
        <p>
          Dodání a montáž se provádí v pracovních dnech (pondělí–pátek) v době od 6:00 do 14:30 hodin.
          V případě požadavku Kupujícího na dodání nebo montáž v sobotu, neděli nebo ve svátek
          je Prodávající oprávněn účtovat příplatek ve výši 10 000 Kč + DPH za každý takový den.
          Příplatek za práci mimo pracovní dobu musí být odsouhlasen Kupujícím předem.
        </p>
      </div>

      {/* Article 11 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          11. Reference
        </h3>
        <p>
          Kupující souhlasí s tím, že Prodávající může pořídit fotodokumentaci realizovaného díla
          a použít ji pro své marketingové a obchodní účely (reference na webu, sociálních sítích,
          v tištěných materiálech apod.). Fotodokumentace nebude obsahovat osobní údaje Kupujícího
          ani přesnou adresu místa plnění bez výslovného souhlasu Kupujícího. Kupující může tento
          souhlas kdykoli písemně odvolat.
        </p>
      </div>

      {/* Article 12 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          12. Záruka
        </h3>
        <p className="mb-1">
          Prodávající poskytuje na dodané zboží následující záruky:
        </p>
        <ul className="list-disc list-inside space-y-0.5 ml-2 mb-1">
          <li><strong>Bazénová konstrukce (skelet)</strong>: záruka 10 let od data předání</li>
          <li><strong>Technologie a příslušenství</strong>: záruka 24 měsíců od data předání</li>
        </ul>
        <p className="mb-1">
          Záruka se nevztahuje na vady způsobené nesprávným užíváním, mechanickým poškozením,
          zásahem třetí osoby, nedodržením pokynů k údržbě, přirozeným opotřebením nebo působením
          vyšší moci. Reklamace musí být uplatněna písemně bez zbytečného odkladu po zjištění vady.
        </p>
        <p>
          Podrobné záruční podmínky a reklamační řád jsou k dispozici na {COMPANY.web}/zarucni-podminky.
        </p>
      </div>

      {/* Article 13 - static */}
      <div className="mb-5" style={{ breakInside: 'avoid' }}>
        <h3 className="text-sm font-bold mb-2 pb-1 border-b border-[#48A9A6]">
          13. Závěrečná ustanovení
        </h3>
        <p className="mb-1">
          Práva a povinnosti touto smlouvou výslovně neupravené se řídí zákonem č. 89/2012 Sb.,
          občanský zákoník, v platném znění, a dalšími právními předpisy České republiky.
        </p>
        <p className="mb-1">
          Kompletní obchodní podmínky Prodávajícího jsou k dispozici na{' '}
          <span className="text-[#48A9A6] font-semibold">{COMPANY.web}/obchodni-podminky</span>{' '}
          a tvoří nedílnou součást této smlouvy. Kupující potvrzuje, že se s obchodními podmínkami
          seznámil a souhlasí s nimi.
        </p>
        <p className="mb-1">
          Smlouva je vyhotovena ve dvou stejnopisech, z nichž každá smluvní strana obdrží
          po jednom výtisku. Smlouva nabývá platnosti a účinnosti dnem podpisu oběma smluvními stranami.
        </p>
        <p>
          Veškeré změny a doplnění této smlouvy musí být provedeny písemnou formou a odsouhlaseny
          oběma smluvními stranami.
        </p>
      </div>
    </div>
  )
}

// Signature page - stairs sketch + signatures with stamp + GDPR
function SignaturePage({ order }: { order: Order }) {
  return (
    <div className="bg-white px-10 py-6 text-[#01384B]">
      {/* Stairs placement sketch */}
      <div className="mb-8" style={{ breakInside: 'avoid' }}>
        <h2 className="text-base font-bold mb-2 pb-1 border-b-2 border-[#48A9A6]">
          Nákres umístění schodiště v bazénu
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          Slouží k vyznačení umístění schodiště Kupujícím. Bez vyznačení umístění schodiště
          nelze bazén zadat do výroby!
        </p>

        {/* Pool sketch */}
        <div className="border-2 border-gray-300 rounded-lg p-6 flex items-center justify-center" style={{ minHeight: '200px' }}>
          <div className="relative" style={{ width: '400px', height: '160px' }}>
            {/* Pool rectangle */}
            <div className="absolute inset-0 border-2 border-[#01384B] rounded-lg" />

            {/* A label - top left corner */}
            <div className="absolute -top-6 -left-1 flex items-center gap-1">
              <span className="text-sm font-semibold text-[#01384B]">A</span>
              <div className="h-px w-12 bg-gray-400" />
            </div>

            {/* B label - bottom left corner */}
            <div className="absolute -bottom-6 -left-1 flex items-center gap-1">
              <span className="text-sm font-semibold text-[#01384B]">B</span>
              <div className="h-px w-12 bg-gray-400" />
            </div>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm text-gray-400 italic">prostor pro nákres</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="mb-6" style={{ breakInside: 'avoid' }}>
        <h2 className="text-base font-bold mb-4 pb-1 border-b-2 border-[#48A9A6]">
          Podpisy smluvních stran
        </h2>

        <div className="grid grid-cols-2 gap-8">
          {/* Seller signature */}
          <div className="p-5 border-2 border-gray-200 rounded-lg relative">
            <p className="text-xs text-gray-500 mb-1">Prodávající:</p>
            <p className="text-xs text-gray-500 mb-3">Pověřený zástupce {COMPANY.name}</p>

            {/* Stamp + signature image area */}
            <div className="h-24 mb-3 flex items-center justify-center">
              <img
                src="/print/rentmil-stamp.png"
                alt="Razítko a podpis"
                className="max-h-24 object-contain"
              />
            </div>

            <div className="border-t border-[#01384B] pt-2">
              <p className="font-semibold text-sm text-[#01384B]">{COMPANY.representative.name}</p>
              <p className="text-xs text-gray-500">{COMPANY.representative.role}</p>
            </div>

            <p className="text-xs text-gray-600 mt-3">
              V Plzni dne {order.contract_date ? formatDate(order.contract_date) : formatDate(order.created_at)}
            </p>
          </div>

          {/* Buyer signature */}
          <div className="p-5 border-2 border-[#48A9A6] rounded-lg bg-[#48A9A6]/5">
            <p className="text-xs text-[#48A9A6] mb-4">Kupující:</p>

            <p className="font-semibold text-sm text-[#01384B] mb-3">{order.customer_name}</p>

            {/* Signature line */}
            <div className="h-24 mb-3" />

            <div className="border-t border-[#01384B] pt-2">
              <p className="text-xs text-gray-500">Vlastnoruční podpis</p>
            </div>

            <p className="text-xs text-gray-600 mt-3">V __________ dne __________</p>
          </div>
        </div>
      </div>

      {/* GDPR notice */}
      <div className="p-3 bg-gray-100 rounded-lg text-[10px] text-gray-600 leading-relaxed" style={{ breakInside: 'avoid' }}>
        <p className="font-semibold mb-1">Ochrana osobních údajů</p>
        <p>
          Osobní údaje Kupujícího jsou zpracovávány společností {COMPANY.name}, IČO: {COMPANY.ico},
          jakožto správcem, v souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR).
          Údaje jsou zpracovávány za účelem plnění této smlouvy a oprávněných zájmů správce.
          Více informací o zpracování osobních údajů naleznete na {COMPANY.web}/ochrana-osobnich-udaju.
        </p>
      </div>
    </div>
  )
}

export default async function OrderPrintPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { page, token, quality } = await searchParams

  // Verify print token - required for all requests
  const tokenResult = verifyPrintToken(token, id, 'order')
  if (!tokenResult.valid) {
    notFound() // Return 404 to not leak info about existence
  }

  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  // Select images based on quality (default to email/optimized)
  const images = IMAGE_PATHS[quality === 'print' ? 'print' : 'email']

  // Return specific page based on query param
  if (page === 'title') {
    return <TitlePage order={order} images={images} />
  }

  if (page === 'clauses') {
    return <ContractClausesPage order={order} />
  }

  if (page === 'signature') {
    return <SignaturePage order={order} />
  }

  // Default: contract content
  return <ContractPage order={order} />
}
