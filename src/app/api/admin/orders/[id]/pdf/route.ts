import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument } from 'pdf-lib'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import { getBrowser, closeBrowser } from '@/lib/puppeteer-pool'
import { generatePrintToken, addTokenToUrl } from '@/lib/pdf/print-token'
import {
  generatePdfFromPage,
  createContentPageOptions,
  waitForContent,
  setPdfMetadata,
  PdfMetrics,
} from '@/lib/pdf/generate-pdf'
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

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return new NextResponse('Objednávka nenalezena', { status: 404 })
    }

    // Get the base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    // Start metrics tracking
    const metrics = new PdfMetrics('Objednávka', `${order.order_number} (${quality})`)

    // Generate token for print pages access
    const printToken = generatePrintToken(id, 'order')

    // Get browser from pool
    browser = await getBrowser()
    page = await browser.newPage()

    // Set viewport for A4
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    })

    // Create content page options with standard header/footer
    const contentOptions = await createContentPageOptions(order.order_number)

    // Create merged PDF
    const mergedPdf = await PDFDocument.create()

    // Step 1: Generate title page (no header/footer)
    const titlePageUrl = addTokenToUrl(`${baseUrl}/orders/${id}/print?page=title&quality=${quality}`, printToken)

    const titlePdfBuffer = await generatePdfFromPage(page, titlePageUrl)
    await waitForContent(page, 'img', { context: 'Title page' })
    metrics.step('title-page')

    const titlePdf = await PDFDocument.load(titlePdfBuffer)
    const [titlePage] = await mergedPdf.copyPages(titlePdf, [0])
    mergedPdf.addPage(titlePage)

    // Step 2: Generate contract content page (with header/footer)
    const contentPageUrl = addTokenToUrl(`${baseUrl}/orders/${id}/print?page=content&quality=${quality}`, printToken)

    const contentPdfBuffer = await generatePdfFromPage(page, contentPageUrl, contentOptions)
    await waitForContent(page, 'table', { critical: true, context: 'Content page' })
    metrics.step('content-page')

    const contentPdf = await PDFDocument.load(contentPdfBuffer)
    const contentPageCount = contentPdf.getPageCount()
    for (let i = 0; i < contentPageCount; i++) {
      const [contentPage] = await mergedPdf.copyPages(contentPdf, [i])
      mergedPdf.addPage(contentPage)
    }

    // Step 3: Generate terms page (with header/footer)
    const termsPageUrl = addTokenToUrl(`${baseUrl}/orders/${id}/print?page=terms&quality=${quality}`, printToken)

    const termsPdfBuffer = await generatePdfFromPage(page, termsPageUrl, contentOptions)
    metrics.step('terms-page')

    const termsPdf = await PDFDocument.load(termsPdfBuffer)
    const termsPageCount = termsPdf.getPageCount()
    for (let i = 0; i < termsPageCount; i++) {
      const [termsPage] = await mergedPdf.copyPages(termsPdf, [i])
      mergedPdf.addPage(termsPage)
    }

    // Set PDF metadata
    setPdfMetadata(mergedPdf, {
      title: `Smlouva o dílo ${order.order_number}`,
      documentNumber: order.order_number,
      documentType: 'Objednávka',
    })

    const mergedPdfBytes = await mergedPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    })

    metrics.complete(mergedPdfBytes.length, mergedPdf.getPageCount())

    // Return PDF with quality indicator in filename for print version
    const filename = quality === 'print'
      ? `${order.order_number}-tisk.pdf`
      : `${order.order_number}.pdf`

    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(mergedPdfBytes.length),
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
