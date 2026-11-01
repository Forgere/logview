import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from 'solid-js'
import type { LogMarker } from '~/types'
import { Modal } from '~/components/ui/Modal'
import { diffChars } from '~/services/diffService'

interface CompareModalProps {
  isOpen: boolean
  onClose: () => void
  markers: Array<LogMarker>
  selectedIds: Set<string>
}

type DragMode = 'start' | 'end' | 'both' | null

const ITEM_HEIGHT = 56

export function CompareModal(props: CompareModalProps) {
  const [compareIndices, setCompareIndices] = createSignal<[number, number]>([
    0, 0,
  ])
  const [dragState, setDragState] = createSignal<{
    mode: DragMode
    offset: number
  } | null>(null)

  let listRef: HTMLDivElement | undefined
  let dragModeRef: DragMode = null
  let dragStartRef: { y: number; idx1: number; idx2: number } | null = null
  let dragOffsetRef = 0

  const sortedMarkers = createMemo(() =>
    [...props.markers].sort(
      (a, b) => a.range.startLineNumber - b.range.startLineNumber,
    ),
  )

  // Initialize selection on open
  createEffect(
    on(
      () => props.isOpen,
      (isOpen) => {
        if (isOpen) {
          const markers = sortedMarkers()
          const indices: Array<number> = []
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

        // Auto scroll to keep Base in view
        if (listRef) {
          const targetTop = nextA * ITEM_HEIGHT
          const currentTop = listRef.scrollTop
          const clientHeight = listRef.clientHeight

          if (targetTop < currentTop) {
            listRef.scrollTop = targetTop
          } else if (targetTop > currentTop + clientHeight - ITEM_HEIGHT) {
            listRef.scrollTop = targetTop - clientHeight + ITEM_HEIGHT
          }
        }

        return [nextA, nextB]
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
  })

  const left = createMemo(() => {
    const markers = sortedMarkers()
    const idx = compareIndices()[0]
    return idx >= 0 && idx < markers.length ? markers[idx] : undefined
  })
  const right = createMemo(() => {
    const markers = sortedMarkers()
    const idx = compareIndices()[1]
    return idx >= 0 && idx < markers.length ? markers[idx] : undefined
  })

  const diffResult = createMemo(() => {
    const l = left()
    const r = right()
    if (!l || !r) return null
    return diffChars(l.selectedText, r.selectedText)
  })

  // -- Drag Logic --
  const handleMouseDown = (e: MouseEvent, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    dragModeRef = mode
    dragOffsetRef = 0

    const [leftIndex, rightIndex] = compareIndices()
    dragStartRef = {
      y: e.clientY,
      idx1: leftIndex,
      idx2: rightIndex,
    }

    setDragState({ mode, offset: 0 })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragModeRef || !listRef || !dragStartRef) return

    const deltaY = e.clientY - dragStartRef.y
    dragOffsetRef = deltaY
    setDragState({ mode: dragModeRef, offset: deltaY })
  }

  const handleMouseUp = () => {
    if (dragModeRef && dragStartRef) {
      const currentOffset = dragOffsetRef
      const steps = Math.round(currentOffset / ITEM_HEIGHT)

      const startIdx1 = dragStartRef.idx1
      const startIdx2 = dragStartRef.idx2
      const maxIndex = sortedMarkers().length - 1

      let newIdx1 = startIdx1
      let newIdx2 = startIdx2

      if (dragModeRef === 'start') {
        newIdx1 = Math.max(0, Math.min(maxIndex, startIdx1 + steps))
      } else if (dragModeRef === 'end') {
        newIdx2 = Math.max(0, Math.min(maxIndex, startIdx2 + steps))
      } else {
        // dragModeRef === 'both'
        let safeSteps = steps
        if (startIdx1 + safeSteps < 0) safeSteps = -startIdx1
        if (startIdx1 + safeSteps > maxIndex) safeSteps = maxIndex - startIdx1
        if (startIdx2 + safeSteps < 0) safeSteps = -startIdx2
        if (startIdx2 + safeSteps > maxIndex) safeSteps = maxIndex - startIdx2

        newIdx1 = startIdx1 + safeSteps
        newIdx2 = startIdx2 + safeSteps
      }

      setCompareIndices([newIdx1, newIdx2])
    }

    setDragState(null)
    dragModeRef = null
    dragStartRef = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const renderAnchorOverlay = () => {
    const markers = sortedMarkers()
    if (markers.length === 0) return null

    const overlayHeight = markers.length * ITEM_HEIGHT
    const [leftIndex, rightIndex] = compareIndices()
    const drag = dragState()

    let baseY1 = leftIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2
    let baseY2 = rightIndex * ITEM_HEIGHT + ITEM_HEIGHT / 2

    if (drag) {
      if (drag.mode === 'start') {
        baseY1 += drag.offset
      } else if (drag.mode === 'end') {
        baseY2 += drag.offset
      } else if (drag.mode === 'both') {
        baseY1 += drag.offset
        baseY2 += drag.offset
      }
    }

    const y1 = baseY1
    const y2 = baseY2

    const BASE_X = 12
    const SPINE_X = 24
    const TARGET_X = 36

    const directionY = y2 >= y1 ? 1 : -1
    const height = Math.abs(y2 - y1)
    const radius = 8
    const useCurves = height >= radius * 2

    let pathD = ''
    if (!useCurves) {
      pathD = `M ${BASE_X} ${y1} L ${SPINE_X} ${y1} L ${SPINE_X} ${y2} L ${TARGET_X} ${y2}`
    } else {
      pathD =
        `M ${BASE_X} ${y1} ` +
        `L ${SPINE_X - radius} ${y1} ` +
        `Q ${SPINE_X} ${y1} ${SPINE_X} ${y1 + radius * directionY} ` +
        `L ${SPINE_X} ${y2 - radius * directionY} ` +
        `Q ${SPINE_X} ${y2} ${SPINE_X + radius} ${y2} ` +
        `L ${TARGET_X} ${y2}`
    }

    const gradY1 = y1
    const gradY2 = Math.abs(y2 - y1) < 0.1 ? y1 + 1 : y2

    return (
      <div
        class="absolute top-0 left-0 w-full pointer-events-none z-20"
        style={{ height: `${overlayHeight}px` }}
      >
        <svg class="absolute w-full h-full overflow-visible pointer-events-none">
          <defs>
            <linearGradient
              id="connectorGrad"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={gradY1}
              x2="0"
              y2={gradY2}
            >
              <stop offset="0%" stop-color="#3b82f6" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            stroke-width="16"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="pointer-events-auto cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handleMouseDown(e, 'both')}
          />
          <path
            d={pathD}
            fill="none"
            stroke="url(#connectorGrad)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shadow-sm"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          />
        </svg>

        {/* Base Anchor (A) */}
        <div
          class="absolute w-8 h-8 flex items-center justify-center cursor-grab pointer-events-auto group z-30 hover:z-50 active:cursor-grabbing"
          style={{ top: `${y1 - 16}px`, left: `${BASE_X - 16}px` }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <div class="w-3.5 h-3.5 bg-surface rounded-full border-[3px] border-accent-brand shadow-[0_0_10px_var(--color-accent-brand)] group-hover:scale-125 transition-transform" />
        </div>

        {/* Target Anchor (B) */}
        <div
          class="absolute w-8 h-8 flex items-center justify-center cursor-grab pointer-events-auto group z-30 hover:z-50 active:cursor-grabbing"
          style={{ top: `${y2 - 16}px`, left: `${TARGET_X - 16}px` }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <div class="w-3.5 h-3.5 bg-surface rounded-full border-[3px] border-success shadow-[0_0_10px_var(--color-success)] group-hover:scale-125 transition-transform" />
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Compare Selections"
      class="w-[90vw] max-w-[1200px] h-[80vh]"
    >
      <div class="flex h-full overflow-hidden">
        {/* LEFT SIDEBAR: Marker List & Anchors */}
        <div
          ref={listRef}
          class="w-[300px] bg-background border-r border-border flex flex-col relative select-none shadow-xl z-10 overflow-y-auto custom-scrollbar"
        >
          <div
            class="relative w-full"
            style={{ height: `${sortedMarkers().length * ITEM_HEIGHT}px` }}
          >
            {renderAnchorOverlay()}

            <For each={sortedMarkers()}>
              {(m, idx) => {
                const isLeft = () => idx() === compareIndices()[0]
                const isRight = () => idx() === compareIndices()[1]

                return (
                  <div
                    class={`absolute left-0 right-0 border-b border-border flex flex-col justify-center px-4 pl-12 hover:bg-surface-2 transition-colors cursor-pointer group ${isLeft() || isRight() ? 'bg-surface-2' : ''}`}
                    style={{
                      height: `${ITEM_HEIGHT}px`,
                      top: `${idx() * ITEM_HEIGHT}px`,
                    }}
                    onClick={() =>
                      setCompareIndices([compareIndices()[0], idx()])
                    }
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span
                        class={`font-mono text-xs ${isLeft() ? 'text-accent-brand font-bold' : isRight() ? 'text-success font-bold' : 'text-muted-foreground'}`}
                      >
                        L{m.range.startLineNumber}
                      </span>
                      <span class="text-[10px] text-muted-foreground">
                        {m.timestamp}
                      </span>
                    </div>
                    <div
                      class={`text-xs truncate font-mono ${isLeft() || isRight() ? 'text-foreground' : 'text-muted-foreground opacity-60'}`}
                    >
                      {m.selectedText}
                    </div>

                    {/* Set A/B Buttons */}
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded p-0.5 shadow-lg z-40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompareIndices([idx(), compareIndices()[1]])
                        }}
                        class="w-5 h-5 flex items-center justify-center text-[9px] font-bold bg-accent-brand/20 text-accent-brand hover:bg-accent-brand hover:text-accent-brand-foreground rounded"
                        title="Set as Base (A)"
                      >
                        A
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompareIndices([compareIndices()[0], idx()])
                        }}
                        class="w-5 h-5 flex items-center justify-center text-[9px] font-bold bg-success/20 text-success hover:bg-success hover:text-background rounded"
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
        </div>

        {/* RIGHT CONTENT: Split Diff View */}
        <div class="flex-1 flex flex-col bg-surface min-w-0">
          {/* Top Panel: Base (A) */}
          <div class="flex-1 flex flex-col min-h-0 border-b border-border">
            <div class="h-10 bg-surface-2 border-b border-border flex items-center justify-between px-4 select-none shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded bg-accent-brand text-accent-brand-foreground flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <span class="text-xs font-bold text-muted-foreground uppercase">
                  Base
                </span>
                <Show when={left()}>
                  {(l) => (
                    <span class="text-xs text-muted-foreground font-mono ml-2">
                      Line {l().range.startLineNumber}
                    </span>
                  )}
                </Show>
              </div>
            </div>
            <div class="flex-1 overflow-auto p-4 custom-scrollbar bg-background">
              <div class="font-mono text-sm leading-6 text-foreground whitespace-pre-wrap break-all">
                <Show
                  when={diffResult()}
                  fallback={
                    <span class="text-muted-foreground italic">
                      Select a marker...
                    </span>
                  }
                >
                  <For each={diffResult()}>
                    {(part) => (
                      <>
                        <Show when={part.type === 'equal'}>
                          <span class="opacity-80">{part.value}</span>
                        </Show>
                        <Show when={part.type === 'delete'}>
                          <span class="bg-level-error/20 text-level-error border-b border-level-error/40">
                            {part.value}
                          </span>
                        </Show>
                      </>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          </div>

          {/* Bottom Panel: Target (B) */}
          <div class="flex-1 flex flex-col min-h-0">
            <div class="h-10 bg-surface-2 border-b border-border flex items-center justify-between px-4 select-none shrink-0">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded bg-success text-background flex items-center justify-center text-xs font-bold">
                  B
                </div>
                <span class="text-xs font-bold text-muted-foreground uppercase">
                  Target
                </span>
                <Show when={right()}>
                  {(r) => (
                    <span class="text-xs text-muted-foreground font-mono ml-2">
                      Line {r().range.startLineNumber}
                    </span>
                  )}
                </Show>
              </div>
            </div>
            <div class="flex-1 overflow-auto p-4 custom-scrollbar bg-background">
              <div class="font-mono text-sm leading-6 text-foreground whitespace-pre-wrap break-all">
                <Show
                  when={diffResult()}
                  fallback={
                    <span class="text-muted-foreground italic">
                      Select a marker...
                    </span>
                  }
                >
                  <For each={diffResult()}>
                    {(part) => (
                      <>
                        <Show when={part.type === 'equal'}>
                          <span class="opacity-80">{part.value}</span>
                        </Show>
                        <Show when={part.type === 'insert'}>
                          <span class="bg-success/20 text-success border-b border-success/40">
                            {part.value}
                          </span>
                        </Show>
                      </>
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
