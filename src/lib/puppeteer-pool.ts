import puppeteer, { Browser } from 'puppeteer'

// Puppeteer launch options optimized for Railway/containerized environments
const LAUNCH_OPTIONS = {
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
  ],
}

/**
 * Get a new browser instance for PDF generation.
 * Each request gets its own browser to avoid conflicts.
 */
export async function getBrowser(): Promise<Browser> {
  console.log('[Puppeteer] Launching new browser instance...')
  const browser = await puppeteer.launch(LAUNCH_OPTIONS)
  console.log('[Puppeteer] Browser instance ready')
  return browser
}

/**
 * Close the browser instance after use.
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  if (browser) {
    console.log('[Puppeteer] Closing browser instance...')
    try {
      await browser.close()
    } catch (error) {
      console.error('[Puppeteer] Error closing browser:', error)
    }
  }
}

// Keep releaseBrowser for backwards compatibility (no-op now)
export function releaseBrowser(): void {
  // No-op - browser is closed directly via closeBrowser
}
