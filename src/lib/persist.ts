/**
 * Cross-refresh persistence for app-wide UI preferences.
 *
 * This module is separate from `~/services/configService`, which owns the
 * per-file-extension settings (`hyperlog_config_<ext>`). Everything here lives
 * under the `hyperlog_ui_` prefix and is scoped to the app, not to a file.
 *
 * SSR safety: this app renders on Cloudflare Workers, where `localStorage` does
 * not exist. Every entry point therefore early-returns (or no-ops) when
 * `typeof window === 'undefined'`, the same guard style as `src/lib/theme.ts`,
 * instead of relying on try/catch alone (which would swallow a ReferenceError
 * and mask real bugs).
 *
 * Restoring must happen inside `onMount`, never in a component/provider body:
 * Solid renders the same tree on the server and on the client, so reading
 * localStorage during render would make the client's first paint disagree with
 * the server-rendered HTML and break hydration. `usePersistedSignal` therefore
 * returns server-safe defaults up front and hydrates the stored value on mount.
 */

import { createEffect, createSignal, onMount } from 'solid-js'
import type { Accessor, Setter } from 'solid-js'

const STORAGE_PREFIX = 'hyperlog_ui_'

/**
 * Keys for every app-wide preference. Values are the *suffix* appended to the
 * `hyperlog_ui_` prefix, so `UI_KEYS.viewMode` is stored as
 * `hyperlog_ui_viewMode`.
 *
 * `seenVersion` is intentionally in here too: the upgrade notice compares the
 * stored value against `APP_VERSION` from `~/lib/version`.
 */
export const UI_KEYS = {
  markerPanelOpen: 'markerPanelOpen',
  markerPanelHeight: 'markerPanelHeight',
  excludedLevels: 'excludedLevels',
  searchOnly: 'searchOnly',
  viewMode: 'viewMode',
  watchMode: 'watchMode',
  searchRegex: 'searchRegex',
  searchCase: 'searchCase',
  searchWholeWord: 'searchWholeWord',
  seenVersion: 'seenVersion',
} as const

/**
 * Read a JSON-encoded preference. Returns `fallback` on the server, when the
 * key is absent, or when the stored value cannot be parsed.
 *
 * Note: this does not validate the shape of the parsed value. Callers that
 * persist non-primitive values (e.g. a `Set<LogLevel>` stored as a string
 * array) must normalize it themselves.
 */
export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch (e) {
    console.error('Failed to read preference from local storage', e)
    return fallback
  }
}

/** Write a JSON-encoded preference. No-op on the server and on quota errors. */
export function writeStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to write preference to local storage', e)
  }
}

/**
 * A `createSignal` that survives a refresh.
 *
 * The returned signal behaves exactly like a plain Solid signal, including the
 * updater-function form (`setState((prev) => next)`), so call sites can swap
 * `createSignal(x)` for `usePersistedSignal(UI_KEYS.someKey, x)` with no other
 * change.
 *
 * - Reads: the fallback value until `onMount` restores the stored value, so
 *   server and client first render agree.
 * - Writes: persisted immediately, including writes made from inside an
 *   effect, because persistence is a `createEffect` over the signal rather than
 *   an interception of the setter.
 *
 * Persisting a `Set<LogLevel>` (or any `Set`): `JSON.stringify` turns a `Set`
 * into `{}`, so store it as a *string array* and rebuild the `Set` around the
 * signal:
 *
 * ```ts
 * const [excluded, setExcluded] = usePersistedSignal<Array<LogLevel>>(
 *   UI_KEYS.excludedLevels,
 *   [],
 * )
 * const excludedLevels = createMemo(() => new Set(excluded()))
 * const toggleLevel = (level: LogLevel) =>
 *   setExcluded((prev) =>
 *     prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
 *   )
 * ```
 *
 * The same rule applies to `selectedMarkerIds` if it is ever persisted: keep
 * the signal as `Array<string>` and derive the `Set` for lookups.
 */
export function usePersistedSignal<T>(
  key: string,
  initial: T,
): [Accessor<T>, Setter<T>] {
  const [value, setValue] = createSignal<T>(initial)

  // Restore after hydration, never during render.
  onMount(() => {
    setValue(() => readStored(key, initial))
  })

  // Persist on every change, including changes made from other effects.
  createEffect(() => {
    writeStored(key, value())
  })

  return [value, setValue]
}
