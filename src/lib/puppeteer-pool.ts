/**
 * Puppeteer Browser Pool
 *
 * Maintains a warm browser instance to speed up PDF generation.
 * Instead of launching a new browser for each PDF (~3-5s),
 * we reuse the same instance (~0.5-1s per PDF).
 *
 * The browser is automatically closed after 5 minutes of inactivity.
 */

import puppeteer, { Browser } from 'puppeteer'

// Global browser instance
let browserInstance: Browser | null = null
let lastUsedAt = 0
let browserLaunching = false

// Max idle time before closing browser (5 minutes)
const MAX_IDLE_TIME = 5 * 60 * 1000

// Puppeteer launch options for containerized environments
const LAUNCH_OPTIONS = {
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  // Use pipe instead of WebSocket for more stable connection
  pipe: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    // Memory optimization for containers
    '--js-flags=--max-old-space-size=256',
  ],
}

/**
 * Get or create a browser instance.
 * Reuses existing browser if available and connected.
 */
export async function getBrowser(): Promise<Browser> {
  const now = Date.now()

  // If browser exists and is still valid, reuse it
  if (browserInstance) {
    try {
      const isConnected = browserInstance.isConnected()
      if (isConnected) {
        lastUsedAt = now
        console.log('[Puppeteer] Reusing existing browser instance')
        return browserInstance
      }
    } catch {
      // Browser disconnected, will create new one
      browserInstance = null
    }
  }

  // If another request is already launching browser, wait for it
  if (browserLaunching) {
    console.log('[Puppeteer] Waiting for browser launch in progress...')
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (browserInstance && browserInstance.isConnected()) {
        lastUsedAt = now
        return browserInstance
      }
      if (!browserLaunching) break
    }
  }

  // Launch new browser
  browserLaunching = true
  try {
    console.log('[Puppeteer] Launching new browser instance...')
    const startTime = Date.now()
    browserInstance = await puppeteer.launch(LAUNCH_OPTIONS)
    lastUsedAt = now
    console.log(`[Puppeteer] Browser launched in ${Date.now() - startTime}ms`)

    // Schedule cleanup check
    scheduleCleanup()

    return browserInstance
  } finally {
    browserLaunching = false
  }
}

/**
 * Close the browser instance after use.
 * For the pooled browser, this just closes the page, not the browser.
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  // Don't actually close the pooled browser - it will be reused
  // The browser is only closed after MAX_IDLE_TIME of inactivity
  if (browser && browser !== browserInstance) {
    // This is a non-pooled browser, close it
    console.log('[Puppeteer] Closing non-pooled browser instance...')
    try {
      await browser.close()
    } catch (error) {
      console.error('[Puppeteer] Error closing browser:', error)
    }
  }
  // For pooled browser, we just update lastUsedAt (already done in getBrowser)
}

// Keep releaseBrowser for backwards compatibility (no-op now)
export function releaseBrowser(): void {
  // No-op - browser cleanup is handled by idle timeout
}

/**
 * Schedule cleanup of idle browser
 */
let cleanupTimeout: NodeJS.Timeout | null = null

function scheduleCleanup(): void {
  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout)
  }

  cleanupTimeout = setTimeout(async () => {
    if (!browserInstance) return

    const now = Date.now()
    if (now - lastUsedAt > MAX_IDLE_TIME) {
      console.log('[Puppeteer] Closing idle browser after 5 minutes')
      try {
        await browserInstance.close()
      } catch (error) {
        console.error('[Puppeteer] Error closing idle browser:', error)
      } finally {
        browserInstance = null
      }
    } else {
      // Reschedule if browser was used recently
      scheduleCleanup()
    }
  }, MAX_IDLE_TIME)
}

/**
 * Force close the browser (for shutdown)
 */
export async function forceCloseBrowser(): Promise<void> {
  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout)
    cleanupTimeout = null
  }

  if (browserInstance) {
    console.log('[Puppeteer] Force closing browser...')
    try {
      await browserInstance.close()
    } catch (error) {
      console.error('[Puppeteer] Error force closing browser:', error)
    } finally {
      browserInstance = null
      browserLaunching = false
    }
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    forceCloseBrowser().catch(console.error)
  })

  process.on('SIGTERM', () => {
    forceCloseBrowser().catch(console.error)
  })

  process.on('SIGINT', () => {
    forceCloseBrowser().catch(console.error)
  })
}
