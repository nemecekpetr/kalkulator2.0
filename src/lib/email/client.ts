/**
 * Email Client using Resend
 * Handles sending emails to customers
 */

import { Resend } from 'resend'
import { isEmailConfigured } from '@/lib/env'

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Lazy initialization - only create client when needed
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (resendClient) {
    return resendClient
  }

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

function getFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }

  return fromEmail
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend with retry logic
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}): Promise<SendEmailResult> {
  // Check if email is configured before attempting
  if (!isEmailConfigured()) {
    console.warn('Email service not configured, skipping email send')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  let lastError: string | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resend = getResendClient()
      const fromEmail = getFromEmail()

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        replyTo,
      })

      if (error) {
        lastError = error.message

        // Rate limit or server errors - retry
        if (error.message.includes('rate') || error.message.includes('429') || error.message.includes('500')) {
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
            console.warn(`Resend error: ${error.message}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`)
            await sleep(delay)
            continue
          }
        }

        console.error('Resend error:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        messageId: data?.id,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'

      // Network errors - retry
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
        console.warn(`Email send error: ${lastError}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`)
        await sleep(delay)
        continue
      }

      console.error('Email send error:', lastError)
    }
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
  }
}

// Export for advanced use cases
export function getResend(): Resend {
  return getResendClient()
}
