import { For, Show, createMemo, createSignal } from 'solid-js'
import {
  ArrowUp,
  Bookmark,
  ChevronDown,
  Copy,
  Eye,
  GitCompare,
  Maximize2,
  Minimize2,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-solid'
import type { LogMarker, MarkerRange } from '~/types'

interface MarkerPanelProps {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  markers: Array<LogMarker>
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onAnalyze: () => void
  onCompare: () => void
  onCopy: () => void
  onDelete: () => void
  onDeleteMarker: (id: string) => void
  onClearAll: () => void
  onScrollTo: (range: MarkerRange) => void
  onOpenWatch: () => void
}

const ROW_HEIGHT = 42

function MarkerRow(props: {
  marker: LogMarker
  isSelected: boolean
  onSelect: (id: string) => void
  onDeleteSingle: (id: string) => void
  onScroll: (range: MarkerRange) => void
}) {
  return (
    <tr
      class={`h-[42px] border-b border-[#333] hover:bg-[#2a2d2e] transition-colors cursor-pointer ${props.isSelected ? 'bg-[#37373d]' : ''}`}
      onClick={() => props.onScroll(props.marker.range)}
    >
      <td class="p-2 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={props.isSelected}
          onChange={() => props.onSelect(props.marker.id)}
          class="rounded border-gray-600 bg-[#333]"
        />
      </td>
      <td class="p-2 text-blue-400 font-mono text-[10px] w-20">
        L{props.marker.range.startLineNumber}
      </td>
      <td class="p-2 text-gray-500 w-24">{props.marker.timestamp}</td>
      <td class="p-2 overflow-hidden">
        <div class="flex flex-col min-w-0">
          <span class="text-gray-200 font-medium truncate bg-blue-900/20 px-1 rounded text-[11px] mb-1 block">
            {props.marker.selectedText.substring(0, 100).replace(/\n/g, ' ')}
          </span>
        </div>
      </td>
      <td class="p-2 overflow-hidden">
        <div class="flex flex-col min-w-0">
          <span class="text-gray-200 font-medium truncate bg-blue-900/20 px-1 rounded text-[11px] mb-1 block">
            {props.marker.note || ''}
          </span>
        </div>
      </td>
      <td class="p-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => props.onDeleteSingle(props.marker.id)}
          class="text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  )
}

export function MarkerPanel(props: MarkerPanelProps) {
  const [height, setHeight] = createSignal(240)
  const [scrollTop, setScrollTop] = createSignal(0)
  let isResizing = false

  const allSelected = createMemo(
    () => props.markers.length > 0 && props.selectedIds.size === props.markers.length,
  )

  const toggleAll = () => {
    if (allSelected()) {
      props.onDeselectAll()
    } else {
      props.onSelectAll()
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    isResizing = true
    e.preventDefault()

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newHeight = window.innerHeight - e.clientY
      const clamped = Math.max(100, Math.min(window.innerHeight - 100, newHeight))
      setHeight(clamped)
    }

    const handleMouseUp = () => {
      isResizing = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLDivElement
    setScrollTop(target.scrollTop)
  }

  // Virtual scrolling computation
  const virtualScrollData = createMemo(() => {
    const total = props.markers.length
    if (total === 0) return { visibleMarkers: [], spacerTop: 0, spacerBottom: 0 }

    const availableHeight = height() - 36
    const visibleCount = Math.ceil(availableHeight / ROW_HEIGHT)
    const startIdx = Math.floor(scrollTop() / ROW_HEIGHT)

    const buffer = 5
    const effectiveStart = Math.max(0, startIdx - buffer)
    const effectiveEnd = Math.min(total, startIdx + visibleCount + buffer)

    const visibleMarkers = props.markers.slice(effectiveStart, effectiveEnd)
    const spacerTop = effectiveStart * ROW_HEIGHT
    const spacerBottom = (total - effectiveEnd) * ROW_HEIGHT

    return { visibleMarkers, spacerTop, spacerBottom }
  })

  return (
    <div
      class="flex-none bg-[#1e1e1e] border-t border-[#333] flex flex-col transition-none ease-linear relative"
      style={{ height: props.isOpen ? `${height()}px` : '36px' }}
    >
      {/* Resize Handle */}
      <Show when={props.isOpen}>
        <div
          class="absolute top-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-blue-500/50 z-50"
          onMouseDown={handleMouseDown}
        />
      </Show>

      {/* Panel Header */}
      <div
        class="flex items-center justify-between px-4 h-[36px] bg-[#252526] border-b border-[#333] select-none cursor-pointer hover:bg-[#2a2d2e]"
        onDblClick={() => props.setIsOpen(!props.isOpen)}
        onClick={() => {
          if (!props.isOpen) props.setIsOpen(true)
        }}
      >
        <div class="flex items-center gap-2 text-xs font-semibold text-gray-300">
          <Show when={props.isOpen} fallback={<ArrowUp size={14} />}>
            <ChevronDown
              size={14}
              onClick={(e) => {
                e.stopPropagation()
                props.setIsOpen(false)
              }}
            />
          </Show>
          <span>MARKED RANGES ({props.markers.length})</span>
        </div>

        <div class="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={props.onOpenWatch}
            class="flex items-center gap-1.5 px-2 py-0.5 mr-2 rounded text-xs font-medium text-amber-500/80 hover:text-amber-400 hover:bg-amber-950/20 border border-transparent hover:border-amber-900/30 transition-all"
          >
            <Eye size={12} /> Watch
          </button>

          <Show when={props.selectedIds.size > 0}>
            <div class="flex items-center bg-[#333] rounded overflow-hidden mr-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <button
                onClick={props.onAnalyze}
                class="flex items-center gap-1 px-2 py-1 text-xs text-purple-300 hover:bg-[#444] transition-colors border-r border-[#444]"
              >
                <Sparkles size={12} /> Analyze
              </button>
              <button
                onClick={props.onCompare}
                disabled={props.selectedIds.size !== 2}
                class={`flex items-center gap-1 px-2 py-1 text-xs hover:bg-[#444] transition-colors border-r border-[#444] ${props.selectedIds.size !== 2 ? 'text-gray-600' : 'text-blue-300'}`}
              >
                <GitCompare size={12} /> Compare
              </button>
              <button
                onClick={props.onCopy}
                class="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:bg-[#444] transition-colors border-r border-[#444]"
              >
                <Copy size={12} /> Copy
              </button>
              <button
                onClick={props.onDelete}
                class="flex items-center gap-1 px-2 py-1 text-xs text-red-300 hover:bg-[#444] transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </Show>

          <Show when={props.selectedIds.size === 0 && props.markers.length > 0}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                props.onClearAll()
              }}
              class="flex items-center gap-1 px-2 py-1 mr-2 text-xs text-gray-400 hover:text-red-300 hover:bg-[#333] rounded transition-colors"
            >
              <XCircle size={12} /> Clear All
            </button>
          </Show>

          <button
            class="text-gray-500 hover:text-gray-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              props.setIsOpen(!props.isOpen)
            }}
          >
            <Show when={props.isOpen} fallback={<Maximize2 size={14} />}>
              <Minimize2 size={14} />
            </Show>
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <Show when={props.isOpen}>
        <div class="flex-1 overflow-auto custom-scrollbar" onScroll={handleScroll}>
          <Show
            when={props.markers.length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                <Bookmark size={24} class="mb-2 opacity-20" />
                <p>Select text in the editor to mark it.</p>
              </div>
            }
          >
            <table class="w-full text-left border-collapse table-fixed">
              <thead class="bg-[#252526] sticky top-0 text-xs font-medium text-gray-400 z-10 shadow-sm">
                <tr>
                  <th class="w-10 p-2 text-center border-b border-[#333]">
                    <input
                      type="checkbox"
                      checked={allSelected()}
                      onChange={toggleAll}
                      class="rounded border-gray-600 bg-[#333]"
                    />
                  </th>
                  <th class="w-16 p-2 border-b border-[#333]">Pos</th>
                  <th class="w-24 p-2 border-b border-[#333]">Time</th>
                  <th class="p-2 border-b border-[#333]">Selection / Context</th>
                  <th class="p-2 border-b border-[#333]">Note</th>
                  <th class="w-10 p-2 border-b border-[#333]"></th>
                </tr>
              </thead>
              <tbody class="text-xs font-mono text-gray-300">
                <Show when={virtualScrollData().spacerTop > 0}>
                  <tr style={{ height: `${virtualScrollData().spacerTop}px` }}>
                    <td colSpan={6} />
                  </tr>
                </Show>
                <For each={virtualScrollData().visibleMarkers}>
                  {(marker) => (
                    <MarkerRow
                      marker={marker}
                      isSelected={props.selectedIds.has(marker.id)}
                      onSelect={props.onToggleSelect}
                      onDeleteSingle={props.onDeleteMarker}
                      onScroll={props.onScrollTo}
                    />
                  )}
                </For>
                <Show when={virtualScrollData().spacerBottom > 0}>
                  <tr style={{ height: `${virtualScrollData().spacerBottom}px` }}>
                    <td colSpan={6} />
                  </tr>
                </Show>
              </tbody>
            </table>
          </Show>
        </div>
      </Show>
    </div>
  )
}
