/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer')
const { writeFileSync, mkdirSync } = require('fs')
const path = require('path')
const { PDFDocument } = require('pdf-lib')

const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'output')

const PAGES = [
  'page-comparison.html',
  'page-proc-rentmil.html',
  'page-dalsi-kroky.html',
]

async function generatePagePdf(browser, filename) {
  const page = await browser.newPage()
  const url = `http://localhost:3000/mockup/${filename}`
  console.log('Loading:', url)

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluateHandle('document.fonts.ready')
  await new Promise(r => setTimeout(r, 1500))

  await page.evaluate(() => {
    document.querySelectorAll('.lbl').forEach(el => el.style.display = 'none')
    document.body.style.background = 'white'
    document.body.style.padding = '0'
    document.querySelectorAll('.page').forEach(el => {
      el.style.boxShadow = 'none'
      el.style.margin = '0 auto'
      el.style.marginBottom = '0'
    })
  })

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  await page.close()
  return pdfBuffer
}

async function generatePdf() {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  // Generate individual PDFs
  const pdfBuffers = []
  for (const filename of PAGES) {
    const buf = await generatePagePdf(browser, filename)
    pdfBuffers.push(buf)
    console.log(`  ${filename}: ${Math.round(buf.length / 1024)} KB`)
  }

  // Merge into single PDF
  const merged = await PDFDocument.create()
  for (const buf of pdfBuffers) {
    const doc = await PDFDocument.load(buf)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    pages.forEach(p => merged.addPage(p))
  }

  const mergedBytes = await merged.save()
  const outputPath = path.join(OUTPUT_DIR, 'nabidka-mockup-redesign.pdf')
  writeFileSync(outputPath, mergedBytes)
  console.log('PDF saved:', outputPath)
  console.log('Total size:', Math.round(mergedBytes.length / 1024), 'KB')

  await browser.close()
}

generatePdf().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
