import puppeteer, { Browser } from 'puppeteer'

// Singleton browser instance for PDF generation
// Avoids the overhead of launching a new browser for each request

let browserInstance: Browser | null = null
let browserLaunchPromise: Promise<Browser> | null = null
let lastUsed: number = 0

// Close browser after 5 minutes of inactivity
const IDLE_TIMEOUT = 5 * 60 * 1000

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

async function createBrowser(): Promise<Browser> {
  console.log('[Puppeteer] Launching new browser instance...')
  const browser = await puppeteer.launch(LAUNCH_OPTIONS)
  console.log('[Puppeteer] Browser instance ready')
  return browser
}

/**
 * Get a browser instance from the pool.
 * Reuses existing browser if available, otherwise launches a new one.
 */
export async function getBrowser(): Promise<Browser> {
  lastUsed = Date.now()

  // Return existing browser if available and connected
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  // Wait for pending launch if in progress
  if (browserLaunchPromise) {
    return browserLaunchPromise
  }

  // Launch new browser
  browserLaunchPromise = createBrowser()

  try {
    browserInstance = await browserLaunchPromise
    browserLaunchPromise = null

    // Setup idle timeout
    scheduleIdleClose()

    return browserInstance
  } catch (error) {
    browserLaunchPromise = null
    throw error
  }
}

/**
 * Release browser back to pool (just marks it as available).
 * The browser stays open for reuse until idle timeout.
 */
export function releaseBrowser(): void {
  lastUsed = Date.now()
  scheduleIdleClose()
}

/**
 * Force close the browser instance.
 * Used for cleanup on server shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[Puppeteer] Closing browser instance...')
    try {
      await browserInstance.close()
    } catch (error) {
      console.error('[Puppeteer] Error closing browser:', error)
    }
    browserInstance = null
  }
}

let idleTimer: NodeJS.Timeout | null = null

function scheduleIdleClose(): void {
  // Clear existing timer
  if (idleTimer) {
    clearTimeout(idleTimer)
  }

  // Schedule close after idle timeout
  idleTimer = setTimeout(async () => {
    const timeSinceLastUse = Date.now() - lastUsed
    if (timeSinceLastUse >= IDLE_TIMEOUT && browserInstance) {
      console.log('[Puppeteer] Closing browser after idle timeout')
      await closeBrowser()
    }
  }, IDLE_TIMEOUT)
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await closeBrowser()
  })

  process.on('SIGTERM', async () => {
    await closeBrowser()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    await closeBrowser()
    process.exit(0)
  })
}
