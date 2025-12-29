/**
 * Pipedrive Deals API
 * Handles creating persons, deals, and adding products to deals
 */

const PIPEDRIVE_API_URL = 'https://api.pipedrive.com/v1'

// ============================================
// Types
// ============================================

export interface PipedrivePerson {
  id: number
  name: string
  email: Array<{ value: string; primary: boolean }>
  phone: Array<{ value: string; primary: boolean }>
  add_time: string
  update_time: string
}

export interface PipedriveDeal {
  id: number
  title: string
  person_id: number | null
  org_id: number | null
  pipeline_id: number
  stage_id: number
  status: 'open' | 'won' | 'lost' | 'deleted'
  add_time: string
  update_time: string
}

export interface PipedrivePipeline {
  id: number
  name: string
  url_title: string
  order_nr: number
  active: boolean
  deal_probability: boolean
  add_time: string
  update_time: string
}

export interface PipedriveStage {
  id: number
  name: string
  pipeline_id: number
  order_nr: number
  active_flag: boolean
}

interface PipedriveResponse<T> {
  success: boolean
  data: T
  error?: string
  additional_data?: {
    pagination?: {
      start: number
      limit: number
      more_items_in_collection: boolean
    }
  }
}

export interface CreatePersonData {
  name: string
  email: string
  phone: string
}

export interface CreateDealData {
  title: string
  person_id: number
  pipeline_id?: number
  stage_id?: number
  value?: number
  currency?: string
  visible_to?: 1 | 3 | 5 | 7 // 1=owner, 3=owner's group, 5=entire company, 7=everyone
}

export interface AddProductToDealData {
  product_id: number
  item_price: number
  quantity: number
  discount_type?: 'percentage' | 'amount'
  discount?: number
  comments?: string
}

// ============================================
// Retry Configuration
// ============================================

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// API Client
// ============================================

class PipedriveDealsClient {
  private apiToken: string

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<PipedriveResponse<T>> {
    const url = new URL(`${PIPEDRIVE_API_URL}${endpoint}`)
    // Pipedrive API requires api_token as query parameter (not Bearer header)
    url.searchParams.set('api_token', this.apiToken)

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        })

        const data = await response.json()

        // Rate limit - retry with backoff
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '10', 10)
          if (attempt < MAX_RETRIES) {
            console.warn(`Pipedrive rate limit hit, retrying after ${retryAfter}s (attempt ${attempt}/${MAX_RETRIES})`)
            await sleep(retryAfter * 1000)
            continue
          }
        }

        // Server errors - retry with exponential backoff
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
          console.warn(`Pipedrive server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`)
          await sleep(delay)
          continue
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || `Pipedrive API error: ${response.status} ${response.statusText}`
          )
        }

        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Network errors - retry with exponential backoff
        if (attempt < MAX_RETRIES && (error instanceof TypeError || (error as NodeJS.ErrnoException).code === 'ECONNRESET')) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
          console.warn(`Pipedrive network error, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`)
          await sleep(delay)
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  // ============================================
  // Persons API
  // ============================================

  /**
   * Search for a person by email
   */
  async searchPersonByEmail(email: string): Promise<PipedrivePerson | null> {
    try {
      const response = await this.fetch<{ items: Array<{ item: PipedrivePerson }> }>(
        `/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true`
      )

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].item
      }

      return null
    } catch {
      // Not found is not an error
      return null
    }
  }

  /**
   * Create a new person (contact)
   */
  async createPerson(data: CreatePersonData): Promise<PipedrivePerson> {
    const response = await this.fetch<PipedrivePerson>('/persons', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: [{ value: data.email, primary: true }],
        phone: [{ value: data.phone, primary: true }],
        visible_to: 3, // Owner's visibility group
      }),
    })

    return response.data
  }

  /**
   * Find existing person or create new one
   */
  async findOrCreatePerson(data: CreatePersonData): Promise<PipedrivePerson> {
    // First try to find by email
    const existingPerson = await this.searchPersonByEmail(data.email)

    if (existingPerson) {
      return existingPerson
    }

    // Create new person
    return this.createPerson(data)
  }

  // ============================================
  // Pipelines & Stages API
  // ============================================

  /**
   * Get all pipelines
   */
  async getPipelines(): Promise<PipedrivePipeline[]> {
    const response = await this.fetch<PipedrivePipeline[]>('/pipelines')
    return response.data || []
  }

  /**
   * Get pipeline by name (case-insensitive partial match)
   */
  async findPipelineByName(name: string): Promise<PipedrivePipeline | null> {
    const pipelines = await this.getPipelines()
    const normalizedName = name.toLowerCase()

    return (
      pipelines.find(p =>
        p.name.toLowerCase().includes(normalizedName) && p.active
      ) || null
    )
  }

  /**
   * Get stages for a pipeline
   */
  async getStages(pipelineId: number): Promise<PipedriveStage[]> {
    const response = await this.fetch<PipedriveStage[]>(
      `/stages?pipeline_id=${pipelineId}`
    )
    return response.data || []
  }

  /**
   * Get first stage of a pipeline
   */
  async getFirstStage(pipelineId: number): Promise<PipedriveStage | null> {
    const stages = await this.getStages(pipelineId)
    const sortedStages = stages.sort((a, b) => a.order_nr - b.order_nr)
    return sortedStages[0] || null
  }

  // ============================================
  // Deals API
  // ============================================

  /**
   * Create a new deal
   */
  async createDeal(data: CreateDealData): Promise<PipedriveDeal> {
    const response = await this.fetch<PipedriveDeal>('/deals', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        person_id: data.person_id,
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        value: data.value,
        currency: data.currency || 'CZK',
        visible_to: data.visible_to || 3,
      }),
    })

    return response.data
  }

  /**
   * Add a note to a deal
   */
  async addNoteToDeal(dealId: number, content: string): Promise<void> {
    await this.fetch('/notes', {
      method: 'POST',
      body: JSON.stringify({
        deal_id: dealId,
        content: content,
        pinned_to_deal_flag: true,
      }),
    })
  }

  // ============================================
  // Deal Products API
  // ============================================

  /**
   * Add a product to a deal
   */
  async addProductToDeal(
    dealId: number,
    data: AddProductToDealData
  ): Promise<void> {
    await this.fetch(`/deals/${dealId}/products`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: data.product_id,
        item_price: data.item_price,
        quantity: data.quantity,
        discount_type: data.discount_type,
        discount: data.discount,
        comments: data.comments,
      }),
    })
  }

  /**
   * Add multiple products to a deal
   */
  async addProductsToDeal(
    dealId: number,
    products: AddProductToDealData[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const product of products) {
      try {
        await this.addProductToDeal(dealId, product)
        success++
      } catch (err) {
        failed++
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Product ${product.product_id}: ${errorMessage}`)
      }
    }

    return { success, failed, errors }
  }
}

// ============================================
// Singleton instance
// ============================================

let clientInstance: PipedriveDealsClient | null = null

// ============================================
// Factory function
// ============================================

export function createPipedriveDealsClient(): PipedriveDealsClient {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance
  }

  const apiToken = process.env.PIPEDRIVE_API_TOKEN

  if (!apiToken) {
    throw new Error('PIPEDRIVE_API_TOKEN is not configured')
  }

  clientInstance = new PipedriveDealsClient(apiToken)
  return clientInstance
}

export { PipedriveDealsClient }
