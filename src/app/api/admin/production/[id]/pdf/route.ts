import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument } from 'pdf-lib'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import { getBrowser, closeBrowser } from '@/lib/puppeteer-pool'
import { generatePrintToken, addTokenToUrl } from '@/lib/pdf/print-token'
import { generatePdfFromPage, waitForContent, setPdfMetadata, PdfMetrics } from '@/lib/pdf/generate-pdf'
import type { Browser, Page } from 'puppeteer'

// Route segment config
export const maxDuration = 60 // Allow up to 60 seconds for PDF generation

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isAuthError(authResult)) return authResult.error

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    const { id } = await params
    const url = new URL(request.url)

    // Get quality parameter (email = optimized for size, print = high quality)
    const quality = url.searchParams.get('quality') === 'print' ? 'print' : 'email'

    const supabase = await createAdminClient()

    // Verify production order exists
    const { data: production, error: productionError } = await supabase
      .from('production_orders')
      .select('production_number')
      .eq('id', id)
      .single()

    if (productionError || !production) {
      return new NextResponse('Vyrobní zadání nenalezeno', { status: 404 })
    }

    // Get the base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    // Start metrics tracking
    const metrics = new PdfMetrics('Výroba', `${production.production_number} (${quality})`)

    // Generate token for print pages access
    const printToken = generatePrintToken(id, 'production')

    // Get browser from pool
    browser = await getBrowser()
    page = await browser.newPage()

    // Set viewport for A4
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    })

    // Navigate to print page (secured by token)
    const printPageUrl = addTokenToUrl(`${baseUrl}/production/${id}/print?quality=${quality}`, printToken)

    // Production page uses custom margins (no header/footer)
    const pdfBuffer = await generatePdfFromPage(page, printPageUrl, {
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    })

    await waitForContent(page, 'img', { context: 'Production page' })
    metrics.step('render-page')

    // Add PDF metadata
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    setPdfMetadata(pdfDoc, {
      title: `Výrobní zadání ${production.production_number}`,
      documentNumber: production.production_number,
      documentType: 'Výrobní zadání',
    })
    const pdfWithMetadata = await pdfDoc.save()

    metrics.complete(pdfWithMetadata.length, 1)

    // Return PDF with quality indicator in filename for print version
    const filename = quality === 'print'
      ? `${production.production_number}-tisk.pdf`
      : `${production.production_number}.pdf`

    return new NextResponse(Buffer.from(pdfWithMetadata), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfWithMetadata.length),
      },
    })
  } catch (error) {
    console.error('[PDF] Generation error:', error)

    return new NextResponse(
      `Chyba při generování PDF: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      { status: 500 }
    )
  } finally {
    if (page) {
      try {
        await page.close()
      } catch {
        // Ignore page close errors
      }
    }
    if (browser) {
      await closeBrowser(browser)
    }
  }
}
