// Pipedrive API client for product synchronization

const PIPEDRIVE_API_URL = 'https://api.pipedrive.com/v1'

// Custom field keys for Pipedrive products
const PIPEDRIVE_FIELD_KEYS = {
  // Old category field (deprecated)
  OLD_CATEGORY: '0bdc4ee4b33bf097f3dd7f3721cccabdad38fb24',
  // New custom fields (2026-01-02)
  OLD_CODE: 'd70e3d375f86b3ca8d8aeac11c11bdec2ba07d5f',      // Starý kód
  SUBCATEGORY: 'eb7b2f0715eb0bd4f4edc787a7453650479070c4',   // Subkategorie
  MANUFACTURER: '8ee82611e1c0ff865111c813e90bb5a779ca59a2',  // Výrobce
} as const

// Manufacturer enum mapping (ID -> label)
const MANUFACTURER_MAP: Record<number, string> = {
  123: 'Rentmil',
  124: 'AZUR',
  125: 'BRILIX',
  126: 'HANSKCRAFT',
  127: 'VA',
  128: 'NORM',
  129: 'RAPID',
  130: 'SEKO',
  131: 'ZODIAC',
  132: 'AUTOCHLOR',
  133: 'VOYAGER',
  134: 'VEKTRO',
  135: 'ALUKOV',
  136: 'ALUPOL',
}

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
  old_code: string | null
  description: string | null
  subcategory: string | null
  manufacturer: string | null
  unit: string
  unit_price: number
  active: boolean
  pipedrive_synced_at: string
} {
  // Get price in CZK or first available price
  const price = product.prices?.find(p => p.currency === 'CZK')?.price
    ?? product.prices?.[0]?.price
    ?? 0

  // Get custom fields
  const oldCode = product[PIPEDRIVE_FIELD_KEYS.OLD_CODE]
  const subcategory = product[PIPEDRIVE_FIELD_KEYS.SUBCATEGORY]
  const manufacturerId = product[PIPEDRIVE_FIELD_KEYS.MANUFACTURER]

  // Resolve manufacturer from enum ID
  // Pipedrive returns enum values as string numbers (e.g., "123")
  let manufacturer: string | null = null
  if (manufacturerId != null) {
    let mfgId: number | undefined
    if (typeof manufacturerId === 'string') {
      const parsed = parseInt(manufacturerId, 10)
      if (!isNaN(parsed)) {
        mfgId = parsed
      } else {
        // If it's a non-numeric string, use it directly (label)
        manufacturer = manufacturerId
      }
    } else if (typeof manufacturerId === 'number') {
      mfgId = manufacturerId
    }
    if (mfgId !== undefined && MANUFACTURER_MAP[mfgId]) {
      manufacturer = MANUFACTURER_MAP[mfgId]
    }
  }

  return {
    pipedrive_id: product.id,
    name: product.name,
    code: product.code,
    old_code: typeof oldCode === 'string' ? oldCode : null,
    description: product.description,
    subcategory: typeof subcategory === 'string' ? subcategory : null,
    manufacturer,
    unit: product.unit || 'ks',
    unit_price: price,
    active: product.active_flag,
    pipedrive_synced_at: new Date().toISOString(),
  }
}

// Get product category from standard category field
export function getProductCategory(product: PipedriveProduct): string | null {
  return product.category
}

export type { PipedriveProduct }
export { PIPEDRIVE_FIELD_KEYS, MANUFACTURER_MAP }
