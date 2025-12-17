import { createEffect, createSignal, on } from 'solid-js'
import { Bookmark, PauseCircle, Play } from 'lucide-solid'
import type { WatchMode } from '~/types'
import { Modal } from '~/components/ui/Modal'

interface WatchSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onStartWatch: (pattern: string, mode: WatchMode) => void
  currentPattern: string
}

export function WatchSettingsModal(props: WatchSettingsModalProps) {
  const [pattern, setPattern] = createSignal(props.currentPattern)
  const [mode, setMode] = createSignal<WatchMode>('PAUSE_ALL')

  // Update pattern when modal opens with current pattern
  createEffect(
    on(
      () => props.isOpen,
      (isOpen) => {
        if (isOpen) setPattern(props.currentPattern)
      },
    ),
  )

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (pattern().trim()) {
      props.onStartWatch(pattern(), mode())
      props.onClose()
    }
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Watch Mode"
      class="w-[500px]"
    >
      <form onSubmit={handleSubmit} class="flex flex-col gap-6">
        <div class="space-y-2">
          <label class="text-xs font-medium text-gray-400 uppercase">
            Watch Pattern
          </label>
          <input
            type="text"
            value={pattern()}
            onInput={(e) => setPattern(e.currentTarget.value)}
            placeholder="e.g. 'FATAL', 'Exception', 'timeout'"
            class="w-full bg-[#1e1e1e] border border-[#444] rounded p-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors font-mono"
            autofocus
          />
        </div>

        <div class="space-y-3">
          <label class="text-xs font-medium text-gray-400 uppercase">
            Action on Match
          </label>

          <label
            class={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${mode() === 'PAUSE_ALL' ? 'bg-amber-950/30 border-amber-700' : 'bg-[#252526] border-[#333] hover:border-[#444]'}`}
          >
            <input
              type="radio"
              name="watchMode"
              checked={mode() === 'PAUSE_ALL'}
              onChange={() => setMode('PAUSE_ALL')}
              class="mt-1"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2 text-sm font-medium text-gray-200 mb-0.5">
                <PauseCircle size={16} class="text-amber-500" />
                Pause Viewer
              </div>
              <p class="text-xs text-gray-500">
                Switches to browse mode at the matched line. The file continues
                loading in the background.
              </p>
            </div>
          </label>

          <label
            class={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${mode() === 'MARK_ONLY' ? 'bg-amber-950/30 border-amber-700' : 'bg-[#252526] border-[#333] hover:border-[#444]'}`}
          >
            <input
              type="radio"
              name="watchMode"
              checked={mode() === 'MARK_ONLY'}
              onChange={() => setMode('MARK_ONLY')}
              class="mt-1"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2 text-sm font-medium text-gray-200 mb-0.5">
                <Bookmark size={16} class="text-amber-500" />
                Just Add Marker
              </div>
              <p class="text-xs text-gray-500">
                Continues following and streaming. Automatically adds a bookmark
                to every matching line.
              </p>
            </div>
          </label>
        </div>

        <div class="flex justify-end gap-3 border-t border-[#333] pt-4">
          <button
            type="button"
            onClick={props.onClose}
            class="px-4 py-2 rounded text-sm text-gray-400 hover:bg-[#333] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Play size={14} fill="currentColor" />
            Start Watch
          </button>
        </div>
      </form>
    </Modal>
  )
}
