const TARGET_ORIGIN = 'https://www.rentmil.cz'

export function trackConfigurator(step: number, label: string): void {
  if (typeof window === 'undefined') return
  if (window.parent === window) return

  try {
    window.parent.postMessage(
      { type: 'rentmil_configurator', step, label },
      TARGET_ORIGIN
    )
  } catch {
    // Silent fail — tracking nesmí shodit aplikaci
  }
}
