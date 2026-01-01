/**
 * Test Email API Route
 * Only available in development mode
 * Usage: GET /api/test-email?to=your@email.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'
import {
  generateConfigurationEmailHtml,
  generateConfigurationEmailText,
} from '@/lib/email/templates/configuration-confirmation'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json(
      { error: 'Missing "to" query parameter. Usage: /api/test-email?to=your@email.com' },
      { status: 400 }
    )
  }

  // Mock data for testing (using valid constants from configurator.ts)
  const mockEmailData = {
    contactName: 'Jan Novák',
    contactEmail: to,
    contactPhone: '+420 123 456 789',
    contactAddress: 'Praha 1, Václavské náměstí 1',
    poolShape: 'rectangle_rounded',
    poolType: 'skimmer',
    dimensions: { width: 3, length: 6, depth: 1.5 },
    color: 'blue',
    stairs: 'roman',
    technology: 'shaft',
    lighting: 'led',
    counterflow: 'none',
    waterTreatment: 'chlorine',
    heating: 'heat_pump',
    roofing: 'none',
  }

  const html = generateConfigurationEmailHtml(mockEmailData)
  const text = generateConfigurationEmailText(mockEmailData)

  const result = await sendEmail({
    to,
    subject: '[TEST] Vaše konfigurace bazénu - Rentmil',
    html,
    text,
    replyTo: 'bazeny@rentmil.cz',
  })

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      messageId: result.messageId,
    })
  } else {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    )
  }
}
