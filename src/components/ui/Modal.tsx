import { Show } from 'solid-js'
import { X } from 'lucide-solid'
import type { ParentProps } from 'solid-js'

interface ModalProps extends ParentProps {
  isOpen: boolean
  onClose: () => void
  title: string
  class?: string
}

export function Modal(props: ModalProps) {
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose()
    }
  }

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div
          class={`bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${props.class || ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex-none flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 class="font-semibold text-foreground">{props.title}</h3>
            <button
              onClick={props.onClose}
              class="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div class="flex-1 overflow-auto p-4 custom-scrollbar">
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  )
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => props.onClose()}
      >
        <div
          class="bg-surface border border-border rounded-lg shadow-2xl w-80 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-4 py-3 border-b border-border">
            <h3 class="font-semibold text-foreground">{props.title}</h3>
          </div>
          <div class="p-4 text-sm text-muted-foreground">{props.message}</div>
          <div class="flex justify-end gap-2 px-4 py-3 border-t border-border">
            <button
              onClick={() => props.onClose()}
              class="px-3 py-1.5 rounded border border-border text-foreground hover:bg-surface-2 transition-colors"
            >
              {props.cancelLabel ?? 'Cancel'}
            </button>
            <button
              onClick={() => {
                props.onConfirm()
                props.onClose()
              }}
              class="px-3 py-1.5 rounded bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity"
            >
              {props.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}
