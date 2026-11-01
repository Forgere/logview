import { createSignal, onMount } from 'solid-js'
import type { Accessor } from 'solid-js'

/**
 * PWA registration and install-prompt handling for HyperLog.
 *
 * The service worker is hand-authored at `public/sw.js` (vite-plugin-pwa /
 * serwist are broken under TanStack Start's Solid renderer). This module only
 * wires it up and exposes a thin, app-safe install API.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}

/** True when the app is already running as an installed standalone PWA. */
function isInstalledStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia(
    '(display-mode: standalone)',
  ).matches
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  return mediaStandalone || iosStandalone
}

/**
 * Register the service worker. Safe to invoke from a client lifecycle hook
 * (e.g. Solid `onMount`): it is a no-op in dev, on the server, or when the
 * browser lacks support, and registration failures are swallowed — a failed
 * SW install must never break the app.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in (navigator as Partial<Navigator>))) return
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch((error: unknown) =>
      console.warn('[hyperlog] service worker registration failed', error),
    )
}

/**
 * Track the deferred `beforeinstallprompt` event so the app can offer a custom
 * install button. Resolves to `true` only when the user accepts the prompt,
 * and clears the deferred prompt afterwards. `isInstallable()` is `false` while
 * already installed or once the prompt has been consumed.
 */
export function usePwaInstall(): {
  isInstallable: Accessor<boolean>
  promptInstall: () => Promise<boolean>
} {
  const [deferred, setDeferred] = createSignal<BeforeInstallPromptEvent | null>(
    null,
  )
  const [isInstallable, setIsInstallable] = createSignal(false)

  onMount(() => {
    if (typeof window === 'undefined') return
    if (isInstalledStandalone()) {
      setIsInstallable(false)
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }
    const onAppInstalled = () => {
      setDeferred(null)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
  })

  const promptInstall = async (): Promise<boolean> => {
    const prompt = deferred()
    if (!prompt) return false
    await prompt.prompt()
    const choice = await prompt.userChoice
    const accepted = choice.outcome === 'accepted'
    setDeferred(null)
    setIsInstallable(false)
    return accepted
  }

  return { isInstallable, promptInstall }
}
