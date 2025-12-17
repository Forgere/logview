import { Show } from 'solid-js'
import type { ParentProps } from 'solid-js'
import { X } from 'lucide-solid'

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
          class={`bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${props.class || ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex-none flex items-center justify-between px-4 py-3 border-b border-[#333]">
            <h3 class="font-semibold text-gray-200">{props.title}</h3>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-white transition-colors"
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
