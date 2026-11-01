import { For, Show, createSignal } from 'solid-js'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-solid'
import type { Component, JSX } from 'solid-js'
import { cn } from '~/lib/utils'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  action?: { label: string; onClick: () => void }
}

const [toasts, setToasts] = createSignal<Array<ToastItem>>([])
let counter = 0

function push(
  message: string,
  type: ToastType = 'info',
  action?: ToastItem['action'],
): number {
  const id = ++counter
  setToasts((prev) => [...prev, { id, message, type, action }])
  const ttl = type === 'error' ? 6000 : 3500
  setTimeout(() => dismiss(id), ttl)
  return id
}

export function dismiss(id: number) {
  setToasts((prev) => prev.filter((t) => t.id !== id))
}

const icons: Record<ToastType, JSX.Element> = {
  info: <Info size={16} class="text-info" />,
  success: <CheckCircle2 size={16} class="text-success" />,
  warning: <TriangleAlert size={16} class="text-warning" />,
  error: <XCircle size={16} class="text-destructive" />,
}

const accent: Record<ToastType, string> = {
  info: 'border-l-info',
  success: 'border-l-success',
  warning: 'border-l-warning',
  error: 'border-l-destructive',
}

export function toast(message: string, type?: ToastType): number
export function toast(
  message: string,
  type: ToastType,
  action: ToastItem['action'],
): number
export function toast(
  message: string,
  type: ToastType = 'info',
  action?: ToastItem['action'],
): number {
  return push(message, type, action)
}

export const ToastHost: Component = () => {
  return (
    <div class="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-80 flex-col gap-2">
      <For each={toasts()}>
        {(t) => (
          <div
            class={cn(
              'pointer-events-auto flex items-start gap-2 rounded-lg border border-border border-l-4 bg-surface-2 px-3 py-2.5 shadow-lg shadow-black/40 animate-in fade-in slide-in-from-bottom-2',
              accent[t.type],
            )}
          >
            <div class="mt-0.5 shrink-0">{icons[t.type]}</div>
            <div class="flex-1 break-words text-sm text-foreground">
              {t.message}
              <Show when={t.action}>
                <button
                  class="ml-2 font-medium text-accent-brand hover:underline"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action?.label}
                </button>
              </Show>
            </div>
            <button
              class="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </For>
    </div>
  )
}
