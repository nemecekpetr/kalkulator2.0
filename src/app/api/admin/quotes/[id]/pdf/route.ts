import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

interface RouteParams {
  params: Promise<{ id: string }>
}

// SVG logo as inline data URI for Puppeteer header
function getLogoDataUri(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.svg')
    const svgContent = fs.readFileSync(logoPath, 'utf-8')
    const base64 = Buffer.from(svgContent).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  } catch {
    // Fallback: return empty string if logo not found
    return ''
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  let browser = null

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Verify quote exists
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('quote_number')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return new NextResponse('Nabídka nenalezena', { status: 404 })
    }

    // Get the base URL from request or environment
    const url = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    console.log('Generating PDF for quote:', quote.quote_number)

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()

    // Set viewport for A4
    await page.setViewport({
      width: 794, // A4 width at 96 DPI
      height: 1123, // A4 height at 96 DPI
      deviceScaleFactor: 1, // Standard quality for smaller file size
    })

    // Step 1: Generate title page PDF (no header/footer)
    const titlePageUrl = `${baseUrl}/quotes/${id}/print?page=title`
    console.log('Generating title page from:', titlePageUrl)

    await page.goto(titlePageUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    await page.waitForSelector('img', { timeout: 5000 }).catch(() => {
      console.log('No images found or timeout')
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    const titlePdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    // Step 2: Generate content pages PDF (with header/footer margins)
    const contentPageUrl = `${baseUrl}/quotes/${id}/print?page=content`
    console.log('Generating content pages from:', contentPageUrl)

    await page.goto(contentPageUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    await page.waitForSelector('img', { timeout: 5000 }).catch(() => {
      console.log('No images found or timeout')
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Get logo as base64 data URI
    const logoDataUri = getLogoDataUri()

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

    const contentPdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '100px',
        right: '0',
        bottom: '50px',
        left: '0',
      },
    })

    await browser.close()
    browser = null

    // Step 3: Merge PDFs - title page first, then content pages
    const titlePdf = await PDFDocument.load(titlePdfBuffer)
    const contentPdf = await PDFDocument.load(contentPdfBuffer)
    const mergedPdf = await PDFDocument.create()

    // Copy title page
    const [titlePage] = await mergedPdf.copyPages(titlePdf, [0])
    mergedPdf.addPage(titlePage)

    // Copy all content pages
    const contentPageCount = contentPdf.getPageCount()
    for (let i = 0; i < contentPageCount; i++) {
      const [contentPage] = await mergedPdf.copyPages(contentPdf, [i])
      mergedPdf.addPage(contentPage)
    }

    const mergedPdfBytes = await mergedPdf.save()

    console.log('PDF generated, size:', mergedPdfBytes.length)

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

    if (browser) {
      await browser.close()
    }

    return new NextResponse(
      `Chyba při generování PDF: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
      { status: 500 }
    )
  }
}
