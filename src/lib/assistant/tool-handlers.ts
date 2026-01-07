import { createAdminClient } from '@/lib/supabase/admin'
import {
  getUpsellingSuggestions,
  calculateUpsellPotential,
} from './upselling-rules'
import {
  createPipedriveActivitiesClient,
  parseRelativeDate,
  parseTime,
  type ActivityType,
} from '@/lib/pipedrive/activities'
import { createPipedriveDealsClient } from '@/lib/pipedrive/deals'
import { getPreferenceLearner } from './preference-learner'
import type { AssistantPreferenceType } from '@/lib/supabase/types'

type ToolResult = {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Execute a tool and return the result
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolResult> {
  const handler = TOOL_HANDLERS[toolName]

  if (!handler) {
    return {
      success: false,
      error: `Neznámý nástroj: ${toolName}`,
    }
  }

  try {
    const result = await handler(toolInput)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Neznámá chyba'
    return {
      success: false,
      error: message,
    }
  }
}

// =============================================================================
// Tool Handler Functions
// =============================================================================

const TOOL_HANDLERS: Record<
  string,
  (input: Record<string, unknown>) => Promise<unknown>
> = {
  // READ TOOLS
  get_quote: handleGetQuote,
  get_order: handleGetOrder,
  get_configuration: handleGetConfiguration,
  search_products: handleSearchProducts,
  get_customer_history: handleGetCustomerHistory,
  get_production_status: handleGetProductionStatus,
  list_recent_quotes: handleListRecentQuotes,
  get_upsell_suggestions: handleGetUpsellSuggestions,
  compare_quotes: handleCompareQuotes,

  // WRITE TOOLS
  create_pipedrive_activity: handleCreatePipedriveActivity,
  set_user_preference: handleSetUserPreference,
  update_quote_item: handleUpdateQuoteItem,
  add_quote_item: handleAddQuoteItem,
  remove_quote_item: handleRemoveQuoteItem,
  apply_discount: handleApplyDiscount,
  update_quote_status: handleUpdateQuoteStatus,
  add_note: handleAddNote,
}

// =============================================================================
// READ HANDLERS
// =============================================================================

async function handleGetQuote(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      items:quote_items(*),
      variants:quote_variants(*)
    `)
    .eq('id', quoteId)
    .single()

  if (error) throw new Error(`Nabídka nenalezena: ${error.message}`)

  return quote
}

async function handleGetOrder(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const orderId = input.order_id as string

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single()

  if (error) throw new Error(`Objednávka nenalezena: ${error.message}`)

  return order
}

async function handleGetConfiguration(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const configId = input.configuration_id as string

  const { data: config, error } = await supabase
    .from('configurations')
    .select('*')
    .eq('id', configId)
    .single()

  if (error) throw new Error(`Konfigurace nenalezena: ${error.message}`)

  return config
}

async function handleSearchProducts(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const query = input.query as string | undefined
  const category = input.category as string | undefined
  const limit = Math.min((input.limit as number) || 10, 20)

  let dbQuery = supabase
    .from('products')
    .select('id, name, code, category, unit_price, unit, manufacturer')
    .eq('active', true)
    .order('name')
    .limit(limit)

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,code.ilike.%${query}%`)
  }

  if (category) {
    dbQuery = dbQuery.eq('category', category)
  }

  const { data: products, error } = await dbQuery

  if (error) throw new Error(`Chyba při hledání: ${error.message}`)

  return { products, count: products?.length || 0 }
}

async function handleGetCustomerHistory(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  let email = input.email as string | undefined
  const name = input.name as string | undefined

  // If name is provided but not email, search for customer by name
  if (name && !email) {
    // Search in quotes by customer_name
    const { data: quoteMatch } = await supabase
      .from('quotes')
      .select('customer_email, customer_name')
      .ilike('customer_name', `%${name}%`)
      .limit(1)
      .single()

    if (quoteMatch?.customer_email) {
      email = quoteMatch.customer_email
    } else {
      // Search in configurations by contact_name
      const { data: configMatch } = await supabase
        .from('configurations')
        .select('contact_email, contact_name')
        .ilike('contact_name', `%${name}%`)
        .eq('is_deleted', false)
        .limit(1)
        .single()

      if (configMatch?.contact_email) {
        email = configMatch.contact_email
      }
    }

    if (!email) {
      return {
        error: `Zákazník "${name}" nenalezen`,
        name,
        configurations: [],
        quotes: [],
        orders: [],
        summary: {
          total_configurations: 0,
          total_quotes: 0,
          total_orders: 0,
        },
      }
    }
  }

  if (!email) {
    throw new Error('Musí být zadán email nebo jméno zákazníka')
  }

  // Get configurations
  const { data: configurations } = await supabase
    .from('configurations')
    .select('id, created_at, pool_shape, pool_type, status, contact_name')
    .eq('contact_email', email)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get quotes with pipedrive_deal_id
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, created_at, status, total_price, customer_name, pipedrive_deal_id')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, created_at, status, total_price, customer_name')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get customer name from first result
  const customerName = quotes?.[0]?.customer_name ||
                       configurations?.[0]?.contact_name ||
                       name ||
                       email

  return {
    email,
    customer_name: customerName,
    configurations: configurations || [],
    quotes: quotes || [],
    orders: orders || [],
    summary: {
      total_configurations: configurations?.length || 0,
      total_quotes: quotes?.length || 0,
      total_orders: orders?.length || 0,
    },
  }
}

async function handleGetProductionStatus(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const orderId = input.order_id as string

  const { data: production, error } = await supabase
    .from('production_orders')
    .select(`
      *,
      items:production_order_items(*)
    `)
    .eq('order_id', orderId)
    .single()

  if (error) throw new Error(`Výroba nenalezena: ${error.message}`)

  return production
}

async function handleListRecentQuotes(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const limit = Math.min((input.limit as number) || 10, 20)
  const status = input.status as string | undefined

  let query = supabase
    .from('quotes')
    .select('id, quote_number, customer_name, status, total_price, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: quotes, error } = await query

  if (error) throw new Error(`Chyba při načítání nabídek: ${error.message}`)

  return { quotes, count: quotes?.length || 0 }
}

// =============================================================================
// WRITE HANDLERS
// =============================================================================

async function handleUpdateQuoteItem(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string
  const itemId = input.item_id as string
  const updates = input.updates as Record<string, unknown>

  // Calculate new total_price if quantity or unit_price changed
  if (updates.quantity || updates.unit_price) {
    const { data: currentItem } = await supabase
      .from('quote_items')
      .select('quantity, unit_price')
      .eq('id', itemId)
      .single()

    if (currentItem) {
      const quantity = (updates.quantity as number) || currentItem.quantity
      const unitPrice = (updates.unit_price as number) || currentItem.unit_price
      updates.total_price = quantity * unitPrice
    }
  }

  const { data: item, error } = await supabase
    .from('quote_items')
    .update(updates)
    .eq('id', itemId)
    .eq('quote_id', quoteId)
    .select()
    .single()

  if (error) throw new Error(`Chyba při úpravě položky: ${error.message}`)

  return { item, message: 'Položka byla úspěšně upravena' }
}

async function handleAddQuoteItem(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string
  const quantity = (input.quantity as number) || 1
  const unitPrice = input.unit_price as number
  const totalPrice = quantity * unitPrice

  // Get max sort_order
  const { data: existingItems } = await supabase
    .from('quote_items')
    .select('sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = (existingItems?.[0]?.sort_order || 0) + 1

  const { data: item, error } = await supabase
    .from('quote_items')
    .insert({
      quote_id: quoteId,
      product_id: input.product_id as string | null,
      name: input.name as string,
      category: input.category as string,
      quantity,
      unit: 'ks',
      unit_price: unitPrice,
      total_price: totalPrice,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw new Error(`Chyba při přidání položky: ${error.message}`)

  return { item, message: 'Položka byla úspěšně přidána' }
}

async function handleRemoveQuoteItem(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string
  const itemId = input.item_id as string

  // Get item name before deleting
  const { data: item } = await supabase
    .from('quote_items')
    .select('name')
    .eq('id', itemId)
    .single()

  const { error } = await supabase
    .from('quote_items')
    .delete()
    .eq('id', itemId)
    .eq('quote_id', quoteId)

  if (error) throw new Error(`Chyba při odebírání položky: ${error.message}`)

  return { message: `Položka "${item?.name}" byla odebrána` }
}

async function handleApplyDiscount(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string
  const variantKey = input.variant_key as string
  const discountPercent = input.discount_percent as number | undefined
  const discountAmount = input.discount_amount as number | undefined

  // Get current variant
  const { data: variant, error: fetchError } = await supabase
    .from('quote_variants')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('variant_key', variantKey)
    .single()

  if (fetchError) throw new Error(`Varianta nenalezena: ${fetchError.message}`)

  // Calculate new values
  const updates: Record<string, number> = {}

  if (discountPercent !== undefined) {
    updates.discount_percent = discountPercent
    updates.discount_amount = Math.round(variant.subtotal * (discountPercent / 100))
  } else if (discountAmount !== undefined) {
    updates.discount_amount = discountAmount
    updates.discount_percent = Math.round((discountAmount / variant.subtotal) * 100 * 10) / 10
  }

  updates.total_price = variant.subtotal - (updates.discount_amount || variant.discount_amount)

  const { data: updatedVariant, error } = await supabase
    .from('quote_variants')
    .update(updates)
    .eq('id', variant.id)
    .select()
    .single()

  if (error) throw new Error(`Chyba při aplikaci slevy: ${error.message}`)

  return {
    variant: updatedVariant,
    message: `Sleva ${updates.discount_percent}% (${formatPrice(updates.discount_amount!)}) aplikována na variantu ${variantKey}`,
    new_total: updatedVariant.total_price,
  }
}

async function handleUpdateQuoteStatus(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string
  const status = input.status as string

  const updates: Record<string, unknown> = { status }

  // Set timestamps based on status
  if (status === 'sent') {
    updates.sent_at = new Date().toISOString()
  } else if (status === 'accepted') {
    updates.accepted_at = new Date().toISOString()
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', quoteId)
    .select()
    .single()

  if (error) throw new Error(`Chyba při změně stavu: ${error.message}`)

  const statusLabels: Record<string, string> = {
    draft: 'Koncept',
    sent: 'Odesláno',
    accepted: 'Akceptováno',
    rejected: 'Odmítnuto',
  }

  return {
    quote,
    message: `Stav nabídky změněn na "${statusLabels[status]}"`,
  }
}

async function handleAddNote(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const entityType = input.entity_type as string
  const entityId = input.entity_id as string
  const note = input.note as string
  const isInternal = input.is_internal !== false

  const table = entityType === 'quote'
    ? 'quotes'
    : entityType === 'order'
      ? 'orders'
      : 'configurations'

  const field = isInternal ? 'internal_notes' : 'notes'

  // Get current notes
  const { data: current } = await supabase
    .from(table)
    .select(field)
    .eq('id', entityId)
    .single()

  const currentNotes = (current as Record<string, string | null>)?.[field] || ''
  const timestamp = new Date().toLocaleString('cs-CZ')
  const newNotes = currentNotes
    ? `${currentNotes}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`

  const { error } = await supabase
    .from(table)
    .update({ [field]: newNotes })
    .eq('id', entityId)

  if (error) throw new Error(`Chyba při přidání poznámky: ${error.message}`)

  return {
    message: `Poznámka přidána k ${entityType}`,
    note,
  }
}

// =============================================================================
// USER PREFERENCE HANDLER
// =============================================================================

async function handleSetUserPreference(
  input: Record<string, unknown>,
  userId?: string
) {
  if (!userId) {
    throw new Error('User ID required for setting preferences')
  }

  const preferenceType = input.preference_type as AssistantPreferenceType
  const preferenceKey = input.preference_key as string
  const preferenceValue = input.preference_value as Record<string, unknown>
  const description = input.description as string

  const learner = getPreferenceLearner()
  await learner.setExplicitPreference(
    userId,
    preferenceType,
    preferenceKey,
    preferenceValue
  )

  return {
    message: `Preference uložena: ${description}`,
    preference_type: preferenceType,
    preference_key: preferenceKey,
  }
}

// =============================================================================
// PIPEDRIVE ACTIVITY HANDLER
// =============================================================================

async function handleCreatePipedriveActivity(input: Record<string, unknown>) {
  // Check if Pipedrive is configured
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    return {
      success: false,
      error: 'Pipedrive není nakonfigurován. Kontaktujte administrátora.',
    }
  }

  const supabase = await createAdminClient()
  const subject = input.subject as string
  const typeInput = input.type as string | undefined
  const dueDateInput = input.due_date as string
  const dueTime = input.due_time as string | undefined
  const quoteId = input.quote_id as string | undefined
  const customerName = input.customer_name as string | undefined
  const dealIdInput = input.deal_id as number | undefined
  const personIdInput = input.person_id as number | undefined
  const note = input.note as string | undefined

  // Default type to 'task' if not specified
  const type: ActivityType = (typeInput as ActivityType) || 'task'

  // Parse relative date
  const dueDate = parseRelativeDate(dueDateInput)
  const parsedTime = dueTime ? parseTime(dueTime) : undefined

  // Get deal_id and person_id
  let dealId = dealIdInput
  let personId = personIdInput
  let linkedCustomerName: string | undefined

  const dealsClient = createPipedriveDealsClient()

  // Strategy 1: Get from quote_id if provided
  if (quoteId && !dealId) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('pipedrive_deal_id, customer_email, customer_name')
      .eq('id', quoteId)
      .single()

    if (quote) {
      if (quote.pipedrive_deal_id) {
        dealId = quote.pipedrive_deal_id
      }
      linkedCustomerName = quote.customer_name

      // Also find person by email
      if (!personId && quote.customer_email) {
        try {
          const person = await dealsClient.searchPersonByEmail(quote.customer_email)
          if (person) {
            personId = person.id
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  // Strategy 2: Search directly in Pipedrive by customer name
  if (customerName && (!dealId || !personId)) {
    try {
      // Search for deal by name in title
      if (!dealId) {
        const deal = await dealsClient.searchDealByName(customerName)
        if (deal) {
          dealId = deal.id
          linkedCustomerName = customerName
          // Deal has person_id attached
          if (!personId && deal.person_id) {
            personId = deal.person_id
          }
        }
      }

      // Search for person by name if still not found
      if (!personId) {
        const person = await dealsClient.searchPersonByName(customerName)
        if (person) {
          personId = person.id
          linkedCustomerName = linkedCustomerName || customerName
        }
      }
    } catch {
      // Ignore Pipedrive errors, continue without linking
    }
  }

  // Create activity in Pipedrive
  try {
    const pipedriveClient = createPipedriveActivitiesClient()

    const activity = await pipedriveClient.createActivity({
      subject,
      type,
      due_date: dueDate,
      due_time: parsedTime,
      deal_id: dealId,
      person_id: personId,
      note,
    })

    // Format response
    const typeLabels: Record<string, string> = {
      call: 'Hovor',
      meeting: 'Schůzka',
      task: 'Úkol',
      deadline: 'Deadline',
      email: 'Email',
      lunch: 'Oběd',
    }

    const formattedDate = new Date(dueDate).toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Build success message with linking info
    let message = `Aktivita "${subject}" vytvořena v Pipedrive na ${formattedDate}${parsedTime ? ` v ${parsedTime}` : ''}.`
    if (linkedCustomerName && dealId) {
      message += ` Propojeno se zákazníkem ${linkedCustomerName}.`
    } else if (customerName && !dealId) {
      message += ` Zákazník "${customerName}" nemá v systému nabídku s Pipedrive dealem - aktivita není propojena.`
    }

    return {
      success: true,
      activity: {
        id: activity.id,
        subject: activity.subject,
        type: type,
        due_date: dueDate,
        due_time: parsedTime || null,
      },
      activity_id: activity.id,
      subject: activity.subject,
      type: typeLabels[type] || type,
      due_date: formattedDate,
      due_time: parsedTime || null,
      deal_id: dealId || null,
      person_id: personId || null,
      customer_name: linkedCustomerName || null,
      message,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Neznámá chyba'
    return {
      success: false,
      error: `Nepodařilo se vytvořit aktivitu v Pipedrive: ${message}`,
    }
  }
}

// =============================================================================
// UPSELLING & COMPARISON HANDLERS
// =============================================================================

async function handleGetUpsellSuggestions(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteId = input.quote_id as string

  // Get quote with items and products
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      items:quote_items(
        *,
        product:products(*)
      )
    `)
    .eq('id', quoteId)
    .single()

  if (error) throw new Error(`Nabídka nenalezena: ${error.message}`)

  // Get upselling suggestions
  const suggestions = getUpsellingSuggestions(quote)
  const totalPotential = calculateUpsellPotential(suggestions)

  return {
    quote_id: quoteId,
    quote_number: quote.quote_number,
    customer_name: quote.customer_name,
    suggestions,
    summary: {
      count: suggestions.length,
      total_potential_value: totalPotential,
      top_priority: suggestions[0]?.message || null,
    },
  }
}

async function handleCompareQuotes(input: Record<string, unknown>) {
  const supabase = await createAdminClient()
  const quoteIds = input.quote_ids as string[]

  if (quoteIds.length < 2) {
    throw new Error('Pro porovnání je potřeba alespoň 2 nabídky')
  }
  if (quoteIds.length > 4) {
    throw new Error('Maximálně lze porovnat 4 nabídky najednou')
  }

  // Get all quotes with items and variants
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      customer_name,
      customer_email,
      status,
      created_at,
      valid_until,
      items:quote_items(
        id,
        name,
        category,
        quantity,
        unit_price,
        total_price
      ),
      variants:quote_variants(
        variant_key,
        subtotal,
        discount_percent,
        discount_amount,
        total_price
      )
    `)
    .in('id', quoteIds)

  if (error) throw new Error(`Chyba při načítání nabídek: ${error.message}`)
  if (!quotes || quotes.length < 2) {
    throw new Error('Nabídky nenalezeny')
  }

  // Build comparison structure
  const comparison = {
    quotes: quotes.map((q) => ({
      id: q.id,
      quote_number: q.quote_number,
      customer_name: q.customer_name,
      customer_email: q.customer_email,
      status: q.status,
      created_at: q.created_at,
      valid_until: q.valid_until,
      item_count: q.items?.length || 0,
      categories: [...new Set(q.items?.map((i) => i.category) || [])],
      variants: q.variants?.map((v) => ({
        key: v.variant_key,
        subtotal: v.subtotal,
        discount: v.discount_percent,
        total: v.total_price,
      })),
    })),
    price_comparison: {
      by_variant: {} as Record<string, { quote_number: string; total: number }[]>,
    },
    item_differences: {
      unique_items: [] as { quote_number: string; items: string[] }[],
      common_categories: [] as string[],
    },
  }

  // Compare prices by variant
  const variantKeys = ['ekonomicka', 'optimalni', 'premiova']
  for (const key of variantKeys) {
    comparison.price_comparison.by_variant[key] = quotes
      .map((q) => {
        const variant = q.variants?.find((v) => v.variant_key === key)
        return {
          quote_number: q.quote_number,
          total: variant?.total_price || 0,
        }
      })
      .filter((v) => v.total > 0)
      .sort((a, b) => a.total - b.total)
  }

  // Find unique items per quote
  const allItemNames = quotes.flatMap((q) => q.items?.map((i) => i.name) || [])
  for (const q of quotes) {
    const qItems = q.items?.map((i) => i.name) || []
    const uniqueToThisQuote = qItems.filter(
      (name) => allItemNames.filter((n) => n === name).length === 1
    )
    if (uniqueToThisQuote.length > 0) {
      comparison.item_differences.unique_items.push({
        quote_number: q.quote_number,
        items: uniqueToThisQuote,
      })
    }
  }

  // Find common categories
  const categorySets = quotes.map(
    (q) => new Set(q.items?.map((i) => i.category) || [])
  )
  const commonCategories = [...categorySets[0]].filter((cat) =>
    categorySets.every((set) => set.has(cat))
  )
  comparison.item_differences.common_categories = commonCategories

  return comparison
}

// Helper
function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}
