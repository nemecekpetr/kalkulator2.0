import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  let browser = null

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Verify production order exists
    const { data: production, error: productionError } = await supabase
      .from('production_orders')
      .select('production_number')
      .eq('id', id)
      .single()

    if (productionError || !production) {
      return new NextResponse('Vyrobni zadani nenalezeno', { status: 404 })
    }

    // Get the base URL from request or environment
    const url = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`

    console.log('Generating PDF for production:', production.production_number)

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
      width: 794, // A4 width at 96 DPI
      height: 1123, // A4 height at 96 DPI
      deviceScaleFactor: 1,
    })

    // Navigate to public print page (same pattern as quotes - secured by UUID obscurity)
    const printPageUrl = `${baseUrl}/production/${id}/print`
    console.log('Generating PDF from:', printPageUrl)

    await page.goto(printPageUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    // Wait for images to load
    await page.waitForSelector('img', { timeout: 5000 }).catch(() => {
      console.log('No images found or timeout')
    })
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    })

    console.log('PDF generated, size:', pdfBuffer.length)

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${production.production_number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)

    return new NextResponse(
      `Chyba pri generovani PDF: ${error instanceof Error ? error.message : 'Neznama chyba'}`,
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
