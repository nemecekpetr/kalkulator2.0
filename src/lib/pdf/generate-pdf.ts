/**
 * Shared PDF generation utilities
 *
 * Extracts common PDF generation logic used across quotes, orders, and production routes.
 */

import type { Page } from 'puppeteer'
import type { PDFDocument } from 'pdf-lib'
import { rgb, StandardFonts } from 'pdf-lib'
import { COMPANY } from '@/lib/constants/company'
import { getLogoDataUri } from './logo-cache'

export interface PdfPageOptions {
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  margin?: { top: string; right: string; bottom: string; left: string }
}

// Default margins for pages with header/footer
export const DEFAULT_CONTENT_MARGIN = {
  top: '100px',
  right: '0',
  bottom: '50px',
  left: '0',
}

// Default margins for title pages (no header/footer)
export const DEFAULT_TITLE_MARGIN = {
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
}

/**
 * Navigate to URL and generate PDF with retry logic
 */
export async function generatePdfFromPage(
  page: Page,
  url: string,
  options: PdfPageOptions = {},
  retries = 2
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Navigate with domcontentloaded for faster initial load
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
        margin: options.margin ?? DEFAULT_TITLE_MARGIN,
      })

      return pdfBuffer
    } catch (error) {
      console.error(`[PDF] Generation attempt ${attempt} failed:`, error)
      if (attempt === retries) {
        throw error
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error('PDF generation failed after retries')
}

/**
 * Wait for specific selector with proper error handling
 */
export async function waitForContent(
  page: Page,
  selector: string,
  options: { timeout?: number; critical?: boolean; context?: string } = {}
): Promise<boolean> {
  const { timeout = 5000, critical = false, context = 'Unknown' } = options

  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    if (critical) {
      console.error(`[PDF] ${context}: waitForSelector(${selector}) timed out - PDF may be incomplete`)
    } else {
      console.warn(`[PDF] ${context}: waitForSelector(${selector}) timed out, continuing anyway`)
    }
    return false
  }
}

/**
 * Create standard header template for PDF documents
 */
export async function createHeaderTemplate(documentNumber: string): Promise<string> {
  const logoDataUri = await getLogoDataUri()

  return `
    <div style="width: 100%; height: 80px; padding: 15px 40px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #48A9A6; font-family: Arial, sans-serif; background: white;">
      <img src="${logoDataUri}" style="height: 50px; width: auto;" />
      <span style="font-size: 14px; font-weight: 600; color: #01384B;">${documentNumber}</span>
    </div>
  `
}

/**
 * Create standard footer template for PDF documents
 */
export function createFooterTemplate(options: { showTotalPages?: boolean } = {}): string {
  const { showTotalPages = true } = options

  return `
    <div style="width: 100%; height: 40px; padding: 10px 40px; box-sizing: border-box; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #6b7280; font-family: Arial, sans-serif; background: white;">
      <span style="flex: 1;">${COMPANY.name} | ${COMPANY.address.full}</span>
      <span style="flex: 1; text-align: center;">${COMPANY.phone} | ${COMPANY.email} | ${COMPANY.web}</span>
    </div>
  `
}

/**
 * Create content page options with standard header/footer
 */
export async function createContentPageOptions(documentNumber: string): Promise<PdfPageOptions> {
  const headerTemplate = await createHeaderTemplate(documentNumber)
  const footerTemplate = createFooterTemplate()

  return {
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: DEFAULT_CONTENT_MARGIN,
  }
}

/**
 * Set PDF metadata for better document management
 */
export function setPdfMetadata(
  pdf: PDFDocument,
  options: {
    title: string
    documentNumber: string
    documentType: 'Nabídka' | 'Objednávka' | 'Výrobní zadání'
  }
): void {
  pdf.setTitle(`${options.documentType} ${options.documentNumber}`)
  pdf.setAuthor(COMPANY.name)
  pdf.setSubject(options.title)
  pdf.setCreator('Rentmil Konfigurátor')
  pdf.setProducer('Puppeteer + pdf-lib')
  pdf.setCreationDate(new Date())
  pdf.setModificationDate(new Date())
}

/**
 * Add page numbers to a merged PDF document.
 * Draws "Strana X z Y" in the bottom-right of each page, skipping the title page (page 1).
 */
export async function addPageNumbers(pdf: PDFDocument): Promise<void> {
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontSize = 8
  const color = rgb(0.612, 0.639, 0.686) // #9CA3AF (gray-400)
  const pageCount = pdf.getPageCount()

  for (let i = 1; i < pageCount; i++) {
    const page = pdf.getPage(i)
    const { width } = page.getSize()
    const text = `Strana ${i + 1} z ${pageCount}`
    const textWidth = font.widthOfTextAtSize(text, fontSize)

    page.drawText(text, {
      x: width - 40 - textWidth,
      y: 18,
      size: fontSize,
      font,
      color,
    })
  }
}

/**
 * PDF generation metrics tracker
 * Logs timing and size information for observability
 */
export class PdfMetrics {
  private startTime: number
  private documentType: string
  private documentNumber: string
  private stepTimes: Map<string, number> = new Map()

  constructor(documentType: string, documentNumber: string) {
    this.startTime = Date.now()
    this.documentType = documentType
    this.documentNumber = documentNumber
    console.log(`[PDF] Starting generation: ${documentType} ${documentNumber}`)
  }

  /**
   * Mark completion of a step
   */
  step(stepName: string): void {
    const elapsed = Date.now() - this.startTime
    this.stepTimes.set(stepName, elapsed)
    console.log(`[PDF] Step "${stepName}" completed at ${elapsed}ms`)
  }

  /**
   * Log final metrics
   */
  complete(sizeBytes: number, pageCount?: number): void {
    const totalTime = Date.now() - this.startTime
    const sizeKb = Math.round(sizeBytes / 1024)

    console.log(
      `[PDF] Completed: ${this.documentType} ${this.documentNumber} | ` +
        `${totalTime}ms | ${sizeKb}KB` +
        (pageCount ? ` | ${pageCount} pages` : '')
    )

    // Log detailed breakdown
    if (this.stepTimes.size > 0) {
      const steps = Array.from(this.stepTimes.entries())
        .map(([name, time]) => `${name}: ${time}ms`)
        .join(', ')
      console.log(`[PDF] Steps: ${steps}`)
    }
  }

  /**
   * Log error
   */
  error(error: unknown): void {
    const elapsed = Date.now() - this.startTime
    console.error(
      `[PDF] Failed: ${this.documentType} ${this.documentNumber} | ` +
        `${elapsed}ms | ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
