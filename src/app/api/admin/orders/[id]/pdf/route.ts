import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'

interface RouteParams {
  params: Promise<{ id: string }>
}

// SVG logo as inline data URI for Puppeteer header
async function getLogoDataUri(): Promise<string> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-transparent.svg')
    const svgContent = await readFile(logoPath, 'utf-8')
    const base64 = Buffer.from(svgContent).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  } catch {
    return ''
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  let browser = null

  try {
    const { id } = await params
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
    const url = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    console.log('Generating PDF for order:', order.order_number)

    // Launch Puppeteer (configured for Railway deployment)
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    })

    const page = await browser.newPage()

    // Set viewport for A4
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    })

    // Get logo as base64 data URI
    const logoDataUri = await getLogoDataUri()

    // Header template
    const headerTemplate = `
      <div style="width: 100%; height: 80px; padding: 15px 40px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #48A9A6; font-family: Arial, sans-serif; background: white;">
        <img src="${logoDataUri}" style="height: 50px; width: auto;" />
        <span style="font-size: 14px; font-weight: 600; color: #01384B;">${order.order_number}</span>
      </div>
    `

    // Footer template with page numbers
    const footerTemplate = `
      <div style="width: 100%; height: 40px; padding: 10px 40px; box-sizing: border-box; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #6b7280; font-family: Arial, sans-serif; background: white;">
        <span>Rentmil s.r.o. | Lidická 1233/26, 323 00 Plzeň | +420 601 588 453 | info@rentmil.cz</span>
        <span>Strana <span class="pageNumber"></span></span>
      </div>
    `

    // Create merged PDF
    const mergedPdf = await PDFDocument.create()

    // Step 1: Generate title page (no header/footer)
    const titlePageUrl = `${baseUrl}/orders/${id}/print?page=title`
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

    // Copy title page
    const titlePdf = await PDFDocument.load(titlePdfBuffer)
    const [titlePage] = await mergedPdf.copyPages(titlePdf, [0])
    mergedPdf.addPage(titlePage)

    // Step 2: Generate contract content page (with header/footer)
    const contentPageUrl = `${baseUrl}/orders/${id}/print?page=content`
    console.log('Generating content page from:', contentPageUrl)

    await page.goto(contentPageUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {
      console.log('No table found or timeout')
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

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

    // Copy content pages
    const contentPdf = await PDFDocument.load(contentPdfBuffer)
    const contentPageCount = contentPdf.getPageCount()
    for (let i = 0; i < contentPageCount; i++) {
      const [contentPage] = await mergedPdf.copyPages(contentPdf, [i])
      mergedPdf.addPage(contentPage)
    }

    // Step 3: Generate terms page (with header/footer)
    const termsPageUrl = `${baseUrl}/orders/${id}/print?page=terms`
    console.log('Generating terms page from:', termsPageUrl)

    await page.goto(termsPageUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    await new Promise((resolve) => setTimeout(resolve, 500))

    const termsPdfBuffer = await page.pdf({
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

    // Copy terms pages
    const termsPdf = await PDFDocument.load(termsPdfBuffer)
    const termsPageCount = termsPdf.getPageCount()
    for (let i = 0; i < termsPageCount; i++) {
      const [termsPage] = await mergedPdf.copyPages(termsPdf, [i])
      mergedPdf.addPage(termsPage)
    }

    const mergedPdfBytes = await mergedPdf.save()

    console.log('PDF generated, size:', mergedPdfBytes.length)

    // Return PDF
    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${order.order_number}.pdf"`,
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
    // Always cleanup browser instance
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
  }
}
