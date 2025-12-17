import { createEffect, createSignal, on } from 'solid-js'
import { Modal } from '~/components/ui/Modal'

interface GoToLineModalProps {
  isOpen: boolean
  onClose: () => void
  maxLine: number
  onGo: (lineNumber: number) => void
}

export function GoToLineModal(props: GoToLineModalProps) {
  const [input, setInput] = createSignal('')
  let inputRef: HTMLInputElement | undefined

  // Focus input when modal opens, clear when closes
  createEffect(
    on(
      () => props.isOpen,
      (isOpen) => {
        if (isOpen) {
          setTimeout(() => inputRef?.focus(), 50)
        } else {
          setInput('')
        }
      },
    ),
  )

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const num = parseInt(input(), 10)
    if (!isNaN(num) && num > 0 && num <= props.maxLine) {
      props.onGo(num) // 1-based line number for Monaco
      props.onClose()
    }
  }

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Go to Line">
      <form onSubmit={handleSubmit} class="flex flex-col gap-4 w-[300px]">
        <div class="text-sm text-gray-400">
          Enter line number (1 - {props.maxLine}):
        </div>
        <input
          ref={inputRef}
          type="number"
          min="1"
          max={props.maxLine}
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          class="bg-[#121212] border border-[#444] rounded p-2 text-white outline-none focus:border-blue-500 transition-colors"
          placeholder="Line number..."
        />
        <div class="flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            class="px-4 py-2 rounded text-sm text-gray-400 hover:bg-[#333] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            Go
          </button>
        </div>
      </form>
    </Modal>
  )
}
