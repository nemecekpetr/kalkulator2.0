/**
 * Internal base URL for Puppeteer PDF rendering.
 *
 * Puppeteer runs inside the same container as the app, so it must fetch the
 * print pages over the loopback interface — NOT the public domain. Routing a
 * self-request out through the public Railway edge can hang/time out (and breaks
 * whenever the public domain, env vars, or networking change). Loopback hits the
 * same `next start` server directly, is faster, and is immune to those changes.
 *
 * `next start` (Railway start command) binds to 0.0.0.0 on `PORT`, so
 * `http://127.0.0.1:$PORT` reaches it. Override with `PDF_INTERNAL_BASE_URL`
 * if the app isn't reachable on loopback in some environment.
 */
export function getPdfBaseUrl(): string {
  const override = process.env.PDF_INTERNAL_BASE_URL
  if (override) {
    return override.replace(/\/$/, '')
  }

  const port = process.env.PORT || '3000'
  return `http://127.0.0.1:${port}`
}
