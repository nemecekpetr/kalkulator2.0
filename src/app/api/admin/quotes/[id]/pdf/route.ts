import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, isAuthError } from '@/lib/auth/api-auth'
import { getBrowser, closeBrowser } from '@/lib/puppeteer-pool'
import { PDFDocument } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'
import type { Browser, Page } from 'puppeteer'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface QuoteVariant {
  id: string
  variant_name: string
  total_price: number
}

// SVG logo as inline data URI for Puppeteer header
async function getLogoDataUri(): Promise<string> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.svg')
    const svgContent = await readFile(logoPath, 'utf-8')
    const base64 = Buffer.from(svgContent).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  } catch {
    // Fallback: return empty string if logo not found
    return ''
  }
}

// Navigate to URL and generate PDF with retry logic
async function generatePdf(
  page: Page,
  url: string,
  options: {
    headerTemplate?: string
    footerTemplate?: string
    displayHeaderFooter?: boolean
    margin?: { top: string; right: string; bottom: string; left: string }
  } = {},
  retries = 2
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Navigate with shorter timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: options.displayHeaderFooter ?? false,
        headerTemplate: options.headerTemplate ?? '',
        footerTemplate: options.footerTemplate ?? '',
        margin: options.margin ?? { top: '0', right: '0', bottom: '0', left: '0' },
      })

      return pdfBuffer
    } catch (error) {
      console.error(`PDF generation attempt ${attempt} failed:`, error)
      if (attempt === retries) {
        throw error
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error('PDF generation failed after retries')
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) return auth.error

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    const { id } = await params
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
    const url = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    console.log('Generating PDF for quote:', quote.quote_number, hasVariants ? `with ${variants?.length} variants` : 'without variants')

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

    // Get logo as base64 data URI
    const logoDataUri = await getLogoDataUri()

    // Header template with inline SVG logo and quote number
    const headerTemplate = `
      <div style="width: 100%; height: 80px; padding: 15px 40px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #48A9A6; font-family: Arial, sans-serif; background: white;">
        <img src="${logoDataUri}" style="height: 50px; width: auto;" />
        <span style="font-size: 14px; font-weight: 600; color: #01384B;">${quote.quote_number}</span>
      </div>
    `

    // Footer template with company info
    const footerTemplate = `
      <div style="width: 100%; height: 40px; padding: 10px 40px; box-sizing: border-box; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #6b7280; font-family: Arial, sans-serif; background: white;">
        Rentmil s.r.o. | Lidická 1233/26, 323 00 Plzeň | +420 601 588 453 | info@rentmil.cz | www.rentmil.cz
      </div>
    `

    const contentMargin = { top: '100px', right: '0', bottom: '50px', left: '0' }
    const contentOptions = {
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: contentMargin,
    }

    // Create merged PDF
    const mergedPdf = await PDFDocument.create()

    // Step 1: Generate title page PDF (no header/footer)
    const titlePageUrl = `${baseUrl}/quotes/${id}/print?page=title`
    console.log('Generating title page from:', titlePageUrl)

    const titlePdfBuffer = await generatePdf(page, titlePageUrl)
    const titlePdf = await PDFDocument.load(titlePdfBuffer)
    const [titlePage] = await mergedPdf.copyPages(titlePdf, [0])
    mergedPdf.addPage(titlePage)

    if (hasVariants) {
      // Multi-variant PDF generation
      // Sort variants: cheapest, most expensive, middle
      const sortedVariants = [...(variants as QuoteVariant[])].sort((a, b) => a.total_price - b.total_price)
      let orderedVariants = sortedVariants
      if (sortedVariants.length === 3) {
        orderedVariants = [sortedVariants[0], sortedVariants[2], sortedVariants[1]]
      }

      // Generate PDF for each variant
      for (const variant of orderedVariants) {
        const variantPageUrl = `${baseUrl}/quotes/${id}/print?page=variant&variant=${variant.id}`
        console.log('Generating variant page:', variant.variant_name)

        const variantPdfBuffer = await generatePdf(page, variantPageUrl, contentOptions)
        const variantPdf = await PDFDocument.load(variantPdfBuffer)
        const variantPageCount = variantPdf.getPageCount()
        for (let i = 0; i < variantPageCount; i++) {
          const [variantPage] = await mergedPdf.copyPages(variantPdf, [i])
          mergedPdf.addPage(variantPage)
        }
      }

      // Generate comparison page
      const comparisonPageUrl = `${baseUrl}/quotes/${id}/print?page=comparison`
      console.log('Generating comparison page')

      const comparisonPdfBuffer = await generatePdf(page, comparisonPageUrl, contentOptions)
      const comparisonPdf = await PDFDocument.load(comparisonPdfBuffer)
      const comparisonPageCount = comparisonPdf.getPageCount()
      for (let i = 0; i < comparisonPageCount; i++) {
        const [comparisonPage] = await mergedPdf.copyPages(comparisonPdf, [i])
        mergedPdf.addPage(comparisonPage)
      }
    } else {
      // Classic single-variant PDF generation
      const contentPageUrl = `${baseUrl}/quotes/${id}/print?page=content`
      console.log('Generating content pages from:', contentPageUrl)

      const contentPdfBuffer = await generatePdf(page, contentPageUrl, contentOptions)
      const contentPdf = await PDFDocument.load(contentPdfBuffer)
      const contentPageCount = contentPdf.getPageCount()
      for (let i = 0; i < contentPageCount; i++) {
        const [contentPage] = await mergedPdf.copyPages(contentPdf, [i])
        mergedPdf.addPage(contentPage)
      }
    }

    const mergedPdfBytes = await mergedPdf.save()

    console.log('PDF generated successfully, size:', mergedPdfBytes.length)

    // Return PDF
    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quote_number}.pdf"`,
        'Content-Length': String(mergedPdfBytes.length),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)

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
