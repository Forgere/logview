import { For } from 'solid-js'
import { Modal } from '~/components/ui/Modal'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { label: 'Find', key: 'Ctrl + F' },
  { label: 'Go to Line', key: 'Ctrl + G' },
  { label: 'Next Match', key: 'Enter' },
  { label: 'Previous Match', key: 'Shift + Enter' },
  { label: 'Close Dialog', key: 'Esc' },
  { label: 'Help', key: 'Shift + ?' },
]

export function ShortcutsModal(props: ShortcutsModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Keyboard Shortcuts"
      class="w-[350px]"
    >
      <div class="space-y-2 text-sm">
        <For each={shortcuts}>
          {(s) => (
            <div class="flex justify-between border-b border-[#333] pb-2 last:border-0">
              <span class="text-gray-400">{s.label}</span>
              <span class="font-mono bg-[#333] px-1.5 rounded text-gray-200 text-xs py-0.5">
                {s.key}
              </span>
            </div>
          )}
        </For>
      </div>
    </Modal>
  )
}
