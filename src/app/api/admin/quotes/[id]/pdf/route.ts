import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError } from '@/lib/auth/api-auth'
import { getBrowser, closeBrowser } from '@/lib/puppeteer-pool'
import { PDFDocument } from 'pdf-lib'
import { generatePrintToken, addTokenToUrl } from '@/lib/pdf/print-token'
import { generatePdfFromPage, createContentPageOptions, setPdfMetadata, PdfMetrics } from '@/lib/pdf/generate-pdf'
import type { Browser, Page } from 'puppeteer'

// Route segment config
export const maxDuration = 60 // Allow up to 60 seconds for PDF generation

interface RouteParams {
  params: Promise<{ id: string }>
}

interface QuoteVariant {
  id: string
  variant_name: string
  total_price: number
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth.error

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    const { id } = await params
    const url = new URL(request.url)

    // Get quality parameter (email = optimized for size, print = high quality)
    const quality = url.searchParams.get('quality') === 'print' ? 'print' : 'email'

    const supabase = await createAdminClient()

    // Verify quote exists and fetch variants
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return new NextResponse('Nabídka nenalezena', { status: 404 })
    }

    // Fetch variants for this quote
    const { data: variants } = await supabase
      .from('quote_variants')
      .select('id, variant_name, total_price')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true })

    const hasVariants = variants && variants.length > 0

    // Get the base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    // Start metrics tracking
    const metrics = new PdfMetrics('Nabídka', `${quote.quote_number} (${quality})`)

    // Generate token for print pages access
    const printToken = generatePrintToken(id, 'quote')

    // Get a new browser instance for this request
    browser = await getBrowser()

    // Create a single page and reuse it
    page = await browser.newPage()

    // Set viewport for A4
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    })

    // Create content page options with standard header/footer
    const contentOptions = await createContentPageOptions(quote.quote_number)

    // Create merged PDF
    const mergedPdf = await PDFDocument.create()

    // Step 1: Generate title page PDF (no header/footer)
    const titlePageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=title&quality=${quality}`, printToken)

    const titlePdfBuffer = await generatePdfFromPage(page, titlePageUrl)
    metrics.step('title-page')
    const titlePdf = await PDFDocument.load(titlePdfBuffer)
    const [titlePage] = await mergedPdf.copyPages(titlePdf, [0])
    mergedPdf.addPage(titlePage)

    // Step 2: Generate intro page (personal letter, no header/footer)
    const introPageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=intro&quality=${quality}`, printToken)

    const introPdfBuffer = await generatePdfFromPage(page, introPageUrl, contentOptions)
    metrics.step('intro-page')
    const introPdf = await PDFDocument.load(introPdfBuffer)
    const [introPage] = await mergedPdf.copyPages(introPdf, [0])
    mergedPdf.addPage(introPage)

    if (hasVariants) {
      // Multi-variant PDF generation
      // Sort variants: cheapest, most expensive, middle
      const sortedVariants = [...(variants as QuoteVariant[])].sort((a, b) => a.total_price - b.total_price)
      let orderedVariants = sortedVariants
      if (sortedVariants.length === 3) {
        orderedVariants = [sortedVariants[0], sortedVariants[2], sortedVariants[1]]
      }

      const hasMultipleVariants = orderedVariants.length > 1

      // Generate PDF for each variant
      for (const variant of orderedVariants) {
        const variantPageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=variant&variant=${variant.id}&quality=${quality}`, printToken)

        const variantPdfBuffer = await generatePdfFromPage(page, variantPageUrl, contentOptions)
        metrics.step(`variant-${variant.variant_name}`)
        const variantPdf = await PDFDocument.load(variantPdfBuffer)
        const variantPageCount = variantPdf.getPageCount()
        for (let i = 0; i < variantPageCount; i++) {
          const [variantPage] = await mergedPdf.copyPages(variantPdf, [i])
          mergedPdf.addPage(variantPage)
        }
      }

      // Generate comparison page only if more than 1 variant
      if (hasMultipleVariants) {
        const comparisonPageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=comparison&quality=${quality}`, printToken)

        const comparisonPdfBuffer = await generatePdfFromPage(page, comparisonPageUrl, contentOptions)
        metrics.step('comparison-page')
        const comparisonPdf = await PDFDocument.load(comparisonPdfBuffer)
        const comparisonPageCount = comparisonPdf.getPageCount()
        for (let i = 0; i < comparisonPageCount; i++) {
          const [comparisonPage] = await mergedPdf.copyPages(comparisonPdf, [i])
          mergedPdf.addPage(comparisonPage)
        }
      }
    } else {
      // Classic single-variant PDF generation
      const contentPageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=content&quality=${quality}`, printToken)

      const contentPdfBuffer = await generatePdfFromPage(page, contentPageUrl, contentOptions)
      metrics.step('content-pages')
      const contentPdf = await PDFDocument.load(contentPdfBuffer)
      const contentPageCount = contentPdf.getPageCount()
      for (let i = 0; i < contentPageCount; i++) {
        const [contentPage] = await mergedPdf.copyPages(contentPdf, [i])
        mergedPdf.addPage(contentPage)
      }
    }

    // Generate closing page (7 důvodů pro Rentmil)
    const closingPageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=closing&quality=${quality}`, printToken)

    const closingPdfBuffer = await generatePdfFromPage(page, closingPageUrl, contentOptions)
    metrics.step('closing-page')
    const closingPdf = await PDFDocument.load(closingPdfBuffer)
    const closingPageCount = closingPdf.getPageCount()
    for (let i = 0; i < closingPageCount; i++) {
      const [closingPage] = await mergedPdf.copyPages(closingPdf, [i])
      mergedPdf.addPage(closingPage)
    }

    // Generate next steps page (reviews, timeline, CTA) - always last
    const nextStepsPageUrl = addTokenToUrl(`${baseUrl}/quotes/${id}/print?page=nextsteps&quality=${quality}`, printToken)

    const nextStepsPdfBuffer = await generatePdfFromPage(page, nextStepsPageUrl, contentOptions)
    metrics.step('nextsteps-page')
    const nextStepsPdf = await PDFDocument.load(nextStepsPdfBuffer)
    const nextStepsPageCount = nextStepsPdf.getPageCount()
    for (let i = 0; i < nextStepsPageCount; i++) {
      const [nextStepsPage] = await mergedPdf.copyPages(nextStepsPdf, [i])
      mergedPdf.addPage(nextStepsPage)
    }

    // Set PDF metadata
    setPdfMetadata(mergedPdf, {
      title: `Cenová nabídka ${quote.quote_number}`,
      documentNumber: quote.quote_number,
      documentType: 'Nabídka',
    })

    const mergedPdfBytes = await mergedPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    })

    metrics.complete(mergedPdfBytes.length, mergedPdf.getPageCount())

    // Return PDF with quality indicator in filename for print version
    const filename = quality === 'print'
      ? `${quote.quote_number}-tisk.pdf`
      : `${quote.quote_number}.pdf`

    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(mergedPdfBytes.length),
      },
    })
  } catch (error) {
    // Note: metrics.error() would be called here but metrics may not be initialized
    // if error occurred before metrics was created
    console.error('[PDF] Generation error:', error)

    return new NextResponse(
      `Chyba při generování PDF: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      { status: 500 }
    )
  } finally {
    // Close page first, then browser
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
