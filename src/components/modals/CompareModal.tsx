import { For, Show, createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'
import { Modal } from '~/components/ui/Modal'
import type { LogMarker } from '~/types'
import { diffChars } from '~/services/diffService'

interface CompareModalProps {
  isOpen: boolean
  onClose: () => void
  markers: Array<LogMarker>
  selectedIds: Set<string>
}

const ITEM_HEIGHT = 56

export function CompareModal(props: CompareModalProps) {
  const [compareIndices, setCompareIndices] = createSignal<[number, number]>([0, 0])
  let listRef: HTMLDivElement | undefined

  const sortedMarkers = createMemo(() =>
    [...props.markers].sort((a, b) => a.range.startLineNumber - b.range.startLineNumber),
  )

  // Initialize selection on open
  createEffect(
    on(
      () => props.isOpen,
      (isOpen) => {
        if (isOpen) {
          const markers = sortedMarkers()
          const indices: number[] = []
          markers.forEach((m, idx) => {
            if (props.selectedIds.has(m.id)) indices.push(idx)
          })
          indices.sort((a, b) => a - b)

          let initialLeft = 0
          let initialRight = 0

          if (indices.length >= 2) {
            initialLeft = indices[0]
            initialRight = indices[1]
          } else if (indices.length === 1) {
            initialLeft = indices[0]
            initialRight = indices[0]
          } else if (markers.length >= 2) {
            initialLeft = 0
            initialRight = 1
          }

          setCompareIndices([initialLeft, initialRight])

          // Scroll to initial position
          setTimeout(() => {
            if (listRef) {
              listRef.scrollTop = initialLeft * ITEM_HEIGHT
            }
          }, 50)
        }
      },
    ),
  )

  // Keyboard navigation
  createEffect(() => {
    if (!props.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return

      e.preventDefault()
      const delta = e.key === 'ArrowUp' ? -1 : 1
      const maxIdx = sortedMarkers().length - 1

      setCompareIndices(([idxA, idxB]) => {
        let nextA = idxA
        let nextB = idxB

        if (e.shiftKey) {
          nextA = Math.min(Math.max(0, idxA + delta), maxIdx)
        } else if (e.ctrlKey || e.metaKey) {
          nextB = Math.min(Math.max(0, idxB + delta), maxIdx)
        } else {
          const proposedA = idxA + delta
          const proposedB = idxB + delta
          if (
            proposedA >= 0 &&
            proposedA <= maxIdx &&
            proposedB >= 0 &&
            proposedB <= maxIdx
          ) {
            nextA = proposedA
            nextB = proposedB
          }
        }

        return [nextA, nextB]
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
  })

  const left = createMemo(() => sortedMarkers()[compareIndices()[0]])
  const right = createMemo(() => sortedMarkers()[compareIndices()[1]])

  const diffResult = createMemo(() => {
    const l = left()
    const r = right()
    if (!l || !r) return null
    return diffChars(l.selectedText, r.selectedText)
  })

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Compare Selections"
      class="w-[90vw] max-w-[1200px] h-[80vh]"
    >
      <div class="flex h-full overflow-hidden">
        {/* LEFT SIDEBAR: Marker List */}
        <div
          ref={listRef}
          class="w-[300px] bg-[#141414] border-r border-[#333] flex flex-col relative select-none shadow-xl z-10 overflow-y-auto custom-scrollbar"
        >
          <For each={sortedMarkers()}>
            {(m, idx) => {
              const isLeft = () => idx() === compareIndices()[0]
              const isRight = () => idx() === compareIndices()[1]

              return (
                <div
                  class={`border-b border-[#333] flex flex-col justify-center px-4 hover:bg-[#1f1f1f] transition-colors cursor-pointer group ${isLeft() || isRight() ? 'bg-[#1f1f1f]' : ''}`}
                  style={{ height: `${ITEM_HEIGHT}px` }}
                  onClick={() => setCompareIndices([compareIndices()[0], idx()])}
                >
                  <div class="flex items-center justify-between mb-1">
                    <span
                      class={`font-mono text-xs ${isLeft() ? 'text-blue-400 font-bold' : isRight() ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}
                    >
                      L{m.range.startLineNumber}
                    </span>
                    <span class="text-[10px] text-gray-500">{m.timestamp}</span>
                  </div>
                  <div
                    class={`text-xs truncate font-mono ${isLeft() || isRight() ? 'text-white' : 'text-gray-400 opacity-60'}`}
                  >
                    {m.selectedText}
                  </div>

                  {/* Set A/B Buttons */}
                  <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#141414] border border-[#333] rounded p-0.5 shadow-lg z-40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCompareIndices([idx(), compareIndices()[1]])
                      }}
                      class="w-5 h-5 flex items-center justify-center text-[9px] font-bold bg-blue-900 text-blue-100 hover:bg-blue-600 rounded"
                      title="Set as Base (A)"
                    >
                      A
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCompareIndices([compareIndices()[0], idx()])
                      }}
                      class="w-5 h-5 flex items-center justify-center text-[9px] font-bold bg-emerald-900 text-emerald-100 hover:bg-emerald-600 rounded"
                      title="Set as Target (B)"
                    >
                      B
                    </button>
                  </div>
                </div>
              )
            }}
          </For>
        </div>

        {/* RIGHT CONTENT: Split Diff View */}
        <div class="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
          {/* Top Panel: Base (A) */}
          <div class="flex-1 flex flex-col min-h-0 border-b border-[#333]">
            <div class="h-10 bg-[#252526] border-b border-[#333] flex items-center justify-between px-4 select-none shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <span class="text-xs font-bold text-gray-400 uppercase">Base</span>
                <Show when={left()}>
                  <span class="text-xs text-gray-500 font-mono ml-2">
                    Line {left()?.range.startLineNumber}
                  </span>
                </Show>
              </div>
            </div>
            <div class="flex-1 overflow-auto p-4 custom-scrollbar bg-[#1a1a1a]">
              <div class="font-mono text-sm leading-6 text-gray-300 whitespace-pre-wrap break-all">
                <Show
                  when={diffResult()}
                  fallback={<span class="text-gray-600 italic">Select a marker...</span>}
                >
                  <For each={diffResult()!}>
                    {(part, i) => (
                      <Show when={part.type === 'equal'}>
                        <span class="opacity-80">{part.value}</span>
                      </Show>
                    )}
                  </For>
                  <For each={diffResult()!}>
                    {(part) => (
                      <Show when={part.type === 'delete'}>
                        <span class="bg-red-500/20 text-red-200 border-b border-red-500/40">
                          {part.value}
                        </span>
                      </Show>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </div>

          {/* Bottom Panel: Target (B) */}
          <div class="flex-1 flex flex-col min-h-0">
            <div class="h-10 bg-[#252526] border-b border-[#333] flex items-center justify-between px-4 select-none shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  B
                </div>
                <span class="text-xs font-bold text-gray-400 uppercase">Target</span>
                <Show when={right()}>
                  <span class="text-xs text-gray-500 font-mono ml-2">
                    Line {right()?.range.startLineNumber}
                  </span>
                </Show>
              </div>
            </div>
            <div class="flex-1 overflow-auto p-4 custom-scrollbar bg-[#1a1a1a]">
              <div class="font-mono text-sm leading-6 text-gray-300 whitespace-pre-wrap break-all">
                <Show
                  when={diffResult()}
                  fallback={<span class="text-gray-600 italic">Select a marker...</span>}
                >
                  <For each={diffResult()!}>
                    {(part) => (
                      <Show when={part.type === 'equal'}>
                        <span class="opacity-80">{part.value}</span>
                      </Show>
                    )}
                  </For>
                  <For each={diffResult()!}>
                    {(part) => (
                      <Show when={part.type === 'insert'}>
                        <span class="bg-emerald-500/20 text-emerald-200 border-b border-emerald-500/40">
                          {part.value}
                        </span>
                      </Show>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
