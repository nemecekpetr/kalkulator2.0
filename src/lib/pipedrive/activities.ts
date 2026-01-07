/**
 * Pipedrive Activities API
 * Handles creating and managing activities (tasks, calls, meetings, etc.)
 */

const PIPEDRIVE_API_URL = 'https://api.pipedrive.com/v1'

// ============================================
// Types
// ============================================

export interface PipedriveActivity {
  id: number
  subject: string
  type: string
  done: boolean
  due_date: string
  due_time: string | null
  duration: string | null
  deal_id: number | null
  person_id: number | null
  org_id: number | null
  note: string | null
  add_time: string
  update_time: string
}

export interface PipedriveActivityType {
  id: number
  key_string: string
  name: string
  icon_key: string
  order_nr: number
  active_flag: boolean
}

interface PipedriveResponse<T> {
  success: boolean
  data: T
  error?: string
}

export type ActivityType = 'call' | 'meeting' | 'task' | 'deadline' | 'email' | 'lunch'

export interface CreateActivityData {
  subject: string
  type: ActivityType
  due_date: string // YYYY-MM-DD
  due_time?: string // HH:MM
  duration?: string // HH:MM
  deal_id?: number
  person_id?: number
  org_id?: number
  note?: string
  done?: boolean
}

// ============================================
// Retry Configuration
// ============================================

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================
// API Client
// ============================================

class PipedriveActivitiesClient {
  private apiToken: string

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<PipedriveResponse<T>> {
    const url = new URL(`${PIPEDRIVE_API_URL}${endpoint}`)
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

        // Rate limit
        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get('Retry-After') || '10',
            10
          )
          if (attempt < MAX_RETRIES) {
            console.warn(
              `Pipedrive rate limit hit, retrying after ${retryAfter}s`
            )
            await sleep(retryAfter * 1000)
            continue
          }
        }

        // Server errors
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
          console.warn(`Pipedrive server error, retrying in ${delay}ms`)
          await sleep(delay)
          continue
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              `Pipedrive API error: ${response.status} ${response.statusText}`
          )
        }

        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (
          attempt < MAX_RETRIES &&
          (error instanceof TypeError ||
            (error as NodeJS.ErrnoException).code === 'ECONNRESET')
        ) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
          console.warn(`Pipedrive network error, retrying in ${delay}ms`)
          await sleep(delay)
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  // ============================================
  // Activity Types API
  // ============================================

  /**
   * Get all available activity types
   */
  async getActivityTypes(): Promise<PipedriveActivityType[]> {
    const response =
      await this.fetch<PipedriveActivityType[]>('/activityTypes')
    return response.data || []
  }

  // ============================================
  // Activities API
  // ============================================

  /**
   * Create a new activity
   */
  async createActivity(data: CreateActivityData): Promise<PipedriveActivity> {
    const response = await this.fetch<PipedriveActivity>('/activities', {
      method: 'POST',
      body: JSON.stringify({
        subject: data.subject,
        type: data.type,
        due_date: data.due_date,
        due_time: data.due_time,
        duration: data.duration,
        deal_id: data.deal_id,
        person_id: data.person_id,
        org_id: data.org_id,
        note: data.note,
        done: data.done ? 1 : 0,
      }),
    })

    return response.data
  }

  /**
   * Get activities for a deal
   */
  async getActivitiesForDeal(dealId: number): Promise<PipedriveActivity[]> {
    const response = await this.fetch<PipedriveActivity[]>(
      `/deals/${dealId}/activities`
    )
    return response.data || []
  }

  /**
   * Get activities for a person
   */
  async getActivitiesForPerson(
    personId: number
  ): Promise<PipedriveActivity[]> {
    const response = await this.fetch<PipedriveActivity[]>(
      `/persons/${personId}/activities`
    )
    return response.data || []
  }

  /**
   * Mark an activity as done
   */
  async markActivityDone(activityId: number): Promise<PipedriveActivity> {
    const response = await this.fetch<PipedriveActivity>(
      `/activities/${activityId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ done: 1 }),
      }
    )
    return response.data
  }

  /**
   * Delete an activity
   */
  async deleteActivity(activityId: number): Promise<void> {
    await this.fetch(`/activities/${activityId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Update an activity
   */
  async updateActivity(
    activityId: number,
    updates: Partial<CreateActivityData>
  ): Promise<PipedriveActivity> {
    const response = await this.fetch<PipedriveActivity>(
      `/activities/${activityId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          ...updates,
          done: updates.done !== undefined ? (updates.done ? 1 : 0) : undefined,
        }),
      }
    )
    return response.data
  }
}

// ============================================
// Singleton instance
// ============================================

let clientInstance: PipedriveActivitiesClient | null = null

// ============================================
// Factory function
// ============================================

export function createPipedriveActivitiesClient(): PipedriveActivitiesClient {
  if (clientInstance) {
    return clientInstance
  }

  const apiToken = process.env.PIPEDRIVE_API_TOKEN

  if (!apiToken) {
    throw new Error('PIPEDRIVE_API_TOKEN is not configured')
  }

  clientInstance = new PipedriveActivitiesClient(apiToken)
  return clientInstance
}

// ============================================
// Helper functions
// ============================================

/**
 * Parse relative date string to YYYY-MM-DD format
 * Supports: "za 3 dny", "příští týden", "zítra", "dnes", "2026-01-15"
 */
export function parseRelativeDate(input: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const normalized = input.toLowerCase().trim()

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  // "dnes" / "today"
  if (normalized === 'dnes' || normalized === 'today') {
    return formatDate(today)
  }

  // "zítra" / "tomorrow"
  if (normalized === 'zítra' || normalized === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDate(tomorrow)
  }

  // "pozítří" / "day after tomorrow"
  if (normalized === 'pozítří') {
    const dayAfter = new Date(today)
    dayAfter.setDate(dayAfter.getDate() + 2)
    return formatDate(dayAfter)
  }

  // "za X dní/dnů/dny" - in X days
  const daysMatch = normalized.match(/za\s+(\d+)\s+(dn[iyůí]|day|days)/)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + days)
    return formatDate(futureDate)
  }

  // "příští týden" / "next week" - Monday of next week
  if (normalized.includes('příští týden') || normalized.includes('next week')) {
    const nextMonday = new Date(today)
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
    return formatDate(nextMonday)
  }

  // "za týden" - in a week
  if (normalized.includes('za týden') || normalized.includes('in a week')) {
    const inAWeek = new Date(today)
    inAWeek.setDate(inAWeek.getDate() + 7)
    return formatDate(inAWeek)
  }

  // Weekday names (Czech)
  const weekdays: Record<string, number> = {
    pondělí: 1,
    úterý: 2,
    středa: 3,
    čtvrtek: 4,
    pátek: 5,
    sobota: 6,
    neděle: 0,
  }

  for (const [dayName, dayNumber] of Object.entries(weekdays)) {
    if (normalized.includes(dayName)) {
      const targetDay = new Date(today)
      const currentDay = today.getDay()
      let daysToAdd = dayNumber - currentDay
      if (daysToAdd <= 0) daysToAdd += 7 // Next occurrence
      targetDay.setDate(targetDay.getDate() + daysToAdd)
      return formatDate(targetDay)
    }
  }

  // Default: return today if can't parse
  console.warn(`Could not parse date: "${input}", defaulting to today`)
  return formatDate(today)
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse time string to HH:MM format and convert from Czech local time to UTC
 * Pipedrive API expects UTC time
 */
export function parseTime(input: string): string | undefined {
  if (!input) return undefined

  const normalized = input.trim()
  let hours: number
  let minutes: number

  // Parse time from input
  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    const [h, m] = normalized.split(':')
    hours = parseInt(h, 10)
    minutes = parseInt(m, 10)
  } else {
    const timeMatch = normalized.match(/(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10)
      minutes = parseInt(timeMatch[2], 10)
    } else {
      return undefined
    }
  }

  // Convert Czech local time to UTC
  // Czech timezone: CET (UTC+1) in winter, CEST (UTC+2) in summer
  // Create a date object to determine if DST is active
  const now = new Date()
  const jan = new Date(now.getFullYear(), 0, 1)
  const jul = new Date(now.getFullYear(), 6, 1)
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
  const isDST = now.getTimezoneOffset() < stdOffset

  // For Czech Republic: CET = UTC+1, CEST = UTC+2
  // Since server may run in different timezone, we hardcode Czech offset
  const czechOffset = isDST ? 2 : 1

  // Subtract offset to convert to UTC
  let utcHours = hours - czechOffset
  if (utcHours < 0) utcHours += 24
  if (utcHours >= 24) utcHours -= 24

  return `${String(utcHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export { PipedriveActivitiesClient }
