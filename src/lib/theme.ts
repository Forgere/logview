/**
 * Reads design tokens from CSS custom properties and resolves them to hex so
 * Monaco's editor theme stays in sync with the app's Tailwind v4 token system
 * (src/styles.css). Tailwind v4 emits oklch() tokens, which Monaco's color
 * parser does not understand, so we resolve via the browser's computed style
 * (which yields rgb()) and convert to hex.
 */

function rgbToHex(rgb: string, fallback: string): string {
  const match = rgb.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (!match) return fallback
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(+match[1])}${toHex(+match[2])}${toHex(+match[3])}`
}

/** Resolve a CSS custom property to a hex color using the browser's engine. */
export function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  if (!raw) return fallback
  // Use a throwaway element so the engine resolves oklch()/rgb() for us.
  const probe = document.createElement('span')
  probe.style.cssText = `position:fixed;visibility:hidden;background-color:${raw}`
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).backgroundColor
  document.body.removeChild(probe)
  return rgbToHex(resolved, fallback)
}

export interface ThemePalette {
  background: string
  selection: string
  lineHighlight: string
  lineNumber: string
  lineNumberActive: string
  match: string
  activeMatch: string
  marker: string
  error: string
  warning: string
  info: string
  debug: string
  timestamp: string
}

export function readPalette(): ThemePalette {
  return {
    background: readToken('--background', '#1e1e1e'),
    selection: readToken('--accent-brand', '#264f78'),
    lineHighlight: readToken('--surface-2', '#2a2d2e'),
    lineNumber: readToken('--muted-foreground', '#6b7280'),
    lineNumberActive: readToken('--foreground', '#ffffff'),
    match: readToken('--warning', '#ca8a04'),
    activeMatch: readToken('--warning', '#f97316'),
    marker: readToken('--accent-brand', '#3b82f6'),
    error: readToken('--level-error', '#ff6b6b'),
    warning: readToken('--level-warn', '#facc15'),
    info: readToken('--level-info', '#34d399'),
    debug: readToken('--level-debug', '#9ca3af'),
    timestamp: readToken('--info', '#569cd6'),
  }
}
