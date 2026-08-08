import { registerSW } from 'virtual:pwa-register'

/**
 * Register the service worker with auto-update.
 * On new content, the SW activates and reloads clients after the next idle load.
 */
export function setupPwa(): void {
  if (typeof window === 'undefined') {
    return
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Periodic update check (every 60 minutes) when the tab stays open
      if (!registration) {
        return
      }
      const hour = 60 * 60 * 1000
      window.setInterval(() => {
        void registration.update()
      }, hour)
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        console.warn('[pwa] service worker registration failed', error)
      }
    },
  })
}
