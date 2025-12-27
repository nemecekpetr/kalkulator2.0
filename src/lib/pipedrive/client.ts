// Pipedrive API client for product synchronization

const PIPEDRIVE_API_URL = 'https://api.pipedrive.com/v1'

// Custom field key for "Kategorie produktu" in Pipedrive
const PIPEDRIVE_CATEGORY_FIELD_KEY = '0bdc4ee4b33bf097f3dd7f3721cccabdad38fb24'

interface PipedriveProduct {
  id: number
  name: string
  code: string | null
  description: string | null
  unit: string | null
  tax: number
  category: string | null
  active_flag: boolean
  selectable: boolean
  prices: Array<{
    price: number
    currency: string
    cost: number
    overhead_cost: number
  }>
  add_time: string
  update_time: string
  // Custom fields - accessed by their hash key
  [key: string]: unknown
}

interface PipedriveResponse<T> {
  success: boolean
  data: T
  additional_data?: {
    pagination?: {
      start: number
      limit: number
      more_items_in_collection: boolean
      next_start: number
    }
  }
}

export class PipedriveClient {
  private apiToken: string

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = new URL(`${PIPEDRIVE_API_URL}${endpoint}`)
    url.searchParams.set('api_token', this.apiToken)

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getProducts(start = 0, limit = 100): Promise<PipedriveResponse<PipedriveProduct[]>> {
    return this.fetch<PipedriveResponse<PipedriveProduct[]>>(
      `/products?start=${start}&limit=${limit}`
    )
  }

  async getAllProducts(): Promise<PipedriveProduct[]> {
    const allProducts: PipedriveProduct[] = []
    let start = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      const response = await this.getProducts(start, limit)

      if (response.data && response.data.length > 0) {
        allProducts.push(...response.data)
      }

      hasMore = response.additional_data?.pagination?.more_items_in_collection ?? false
      start = response.additional_data?.pagination?.next_start ?? start + limit
    }

    return allProducts
  }

  async getProduct(id: number): Promise<PipedriveResponse<PipedriveProduct>> {
    return this.fetch<PipedriveResponse<PipedriveProduct>>(`/products/${id}`)
  }
}

// Helper to create client with env token
export function createPipedriveClient(): PipedriveClient {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN

  if (!apiToken) {
    throw new Error('PIPEDRIVE_API_TOKEN is not configured')
  }

  return new PipedriveClient(apiToken)
}

// Map Pipedrive product to our product format
export function mapPipedriveProduct(product: PipedriveProduct): {
  pipedrive_id: number
  name: string
  code: string | null
  description: string | null
  unit: string
  unit_price: number
  active: boolean
  pipedrive_synced_at: string
} {
  // Get price in CZK or first available price
  const price = product.prices?.find(p => p.currency === 'CZK')?.price
    ?? product.prices?.[0]?.price
    ?? 0

  return {
    pipedrive_id: product.id,
    name: product.name,
    code: product.code,
    description: product.description,
    unit: product.unit || 'ks',
    unit_price: price,
    active: product.active_flag,
    pipedrive_synced_at: new Date().toISOString(),
  }
}

// Get product category from custom field "Kategorie produktu"
export function getProductCategory(product: PipedriveProduct): string | null {
  const categoryValue = product[PIPEDRIVE_CATEGORY_FIELD_KEY]

  // Custom field can be string or null
  if (typeof categoryValue === 'string') {
    return categoryValue
  }

  // Fallback to standard category field
  return product.category
}

export type { PipedriveProduct }
export { PIPEDRIVE_CATEGORY_FIELD_KEY }
