import { createFileRoute } from '@tanstack/solid-router'
import { For, Show, createEffect, createSignal, onMount } from 'solid-js'
import {
  GripHorizontal,
  PanelRightClose,
  PanelRightOpen,
  X,
} from 'lucide-solid'
import type {
  FileInfo,
  HighlightRule,
  LogMarker,
  SearchOptions,
  ViewMode,
  ViewSettings,
} from '~/types'
import { AppHeader } from '~/components/Viewer/AppHeader'
import { SearchBar } from '~/components/Viewer/SearchBar'
import { LogViewer } from '~/components/Viewer/LogViewer'
import {
  FileOperationsErrorBoundary,
  LogViewerErrorBoundary,
  ModalErrorBoundary,
  SearchErrorBoundary,
} from '~/components/ErrorBoundary'
import { DEFAULT_HIGHLIGHT_RULES, DEFAULT_VIEW_SETTINGS } from '~/types'

export const Route = createFileRoute('/viewer')({
  component: RouteComponent,
})

function RouteComponent() {
  // Layout state
  const [bottomHeight, setBottomHeight] = createSignal(200)
  const [rightPanelWidth, setRightPanelWidth] = createSignal(300)
  const [isRightPanelOpen, setIsRightPanelOpen] = createSignal(false)

  // File and content state
  const [lines, setLines] = createSignal<Array<string>>([])
  const [fileInfo, setFileInfo] = createSignal<FileInfo | null>(null)
  const [isStreaming, setIsStreaming] = createSignal(false)
  const [progress, setProgress] = createSignal(0)

  // Viewer state
  const [viewMode, setViewMode] = createSignal<ViewMode>('follow')
  const [viewSettings] = createSignal<ViewSettings>(
    DEFAULT_VIEW_SETTINGS,
  )
  const [watchPattern, setWatchPattern] = createSignal('')

  // Search state
  const [searchQuery, setSearchQuery] = createSignal('')
  const [searchOptions, setSearchOptions] = createSignal<SearchOptions>({
    query: '',
    isRegex: false,
    caseSensitive: false,
    wholeWord: false,
  })
  const [searchResults, setSearchResults] = createSignal({
    count: 0,
    currentIndex: -1,
  })

  // Marker state
  const [markers, setMarkers] = createSignal<Array<LogMarker>>([])
  const [highlightRules] = createSignal<
    Array<HighlightRule>
  >(DEFAULT_HIGHLIGHT_RULES)

  // Modals and UI state
  const [showSettings, setShowSettings] = createSignal(false)
  const [showShortcuts, setShowShortcuts] = createSignal(false)
  const [showWatchModal, setShowWatchModal] = createSignal(false)

  let searchInputRef: HTMLInputElement | undefined

  // Resizer handlers
  let startY = 0
  let startHeight = 0
  let startX = 0
  let startWidth = 0

  const onMouseDownBottom = (e: MouseEvent) => {
    e.preventDefault()
    startY = e.clientY
    startHeight = bottomHeight()

    const onMouseMove = (event: MouseEvent) => {
      const delta = startY - event.clientY
      const newHeight = Math.max(80, startHeight + delta)
      setBottomHeight(newHeight)
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseDownRight = (e: MouseEvent) => {
    e.preventDefault()
    startX = e.clientX
    startWidth = rightPanelWidth()

    const onMouseMove = (event: MouseEvent) => {
      const delta = startX - event.clientX
      const newWidth = Math.max(200, startWidth + delta)
      setRightPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // File handling
  const handleFileSelect = (file: File) => {
    setFileInfo({
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      extension: file.name.split('.').pop()?.toLowerCase() || '',
    })

    // Simulate file reading and streaming
    setIsStreaming(true)
    setProgress(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const fileLines = content.split('\n')

      // Simulate progressive loading
      let currentIndex = 0
      const chunkSize = 1000

      const loadChunk = () => {
        const chunk = fileLines.slice(currentIndex, currentIndex + chunkSize)
        setLines((prev) => [...prev, ...chunk])
        currentIndex += chunkSize

        const newProgress = Math.min(
          100,
          (currentIndex / fileLines.length) * 100,
        )
        setProgress(newProgress)

        if (currentIndex < fileLines.length) {
          setTimeout(loadChunk, 50)
        } else {
          setIsStreaming(false)
          setProgress(100)
        }
      }

      loadChunk()
    }

    reader.readAsText(file)
  }

  // Search functionality
  createEffect(() => {
    setSearchOptions({
      query: searchQuery(),
      isRegex: searchOptions().isRegex,
      caseSensitive: searchOptions().caseSensitive,
      wholeWord: searchOptions().wholeWord,
    })
  })

  const handleSearchMatchesChanged = (count: number, currentIndex: number) => {
    setSearchResults({ count, currentIndex })
  }

  const handleNextSearch = () => {
    // This would be implemented in LogViewer component
    console.log('Next search match')
  }

  const handlePrevSearch = () => {
    // This would be implemented in LogViewer component
    console.log('Previous search match')
  }

  // Marker functionality
  const handleAddMarker = (range: any, text: string, context: string) => {
    const newMarker: LogMarker = {
      id: Date.now().toString(),
      range,
      selectedText: text,
      contextLine: context,
      timestamp: new Date().toISOString(),
    }

    setMarkers((prev) => [...prev, newMarker])
  }

  // Sample data for testing
  const loadSampleData = () => {
    const sampleLines = [
      '[2024-01-15 10:23:45] INFO Application starting...',
      '[2024-01-15 10:23:46] DEBUG Loading configuration files',
      '[2024-01-15 10:23:46] INFO Database connection established',
      '[2024-01-15 10:23:47] DEBUG Initializing services',
      '[2024-01-15 10:23:48] WARN Service timeout detected on port 8080',
      '[2024-01-15 10:23:49] ERROR Failed to connect to external API',
      '[2024-01-15 10:23:50] INFO Retry attempt 1/3',
      '[2024-01-15 10:23:51] DEBUG API response: { status: 200, data: {...} }',
      '[2024-01-15 10:23:52] INFO Connection restored successfully',
      '[2024-01-15 10:23:53] DEBUG Processing user request',
      '[2024-01-15 10:23:54] INFO Request completed in 125ms',
      '[2024-01-15 10:23:55] WARN High memory usage detected: 85%',
      '[2024-01-15 10:23:56] DEBUG Garbage collection initiated',
      '[2024-01-15 10:23:57] INFO Memory usage normalized: 45%',
      '[2024-01-15 10:23:58] ERROR Critical error in payment processing',
      '[2024-01-15 10:23:59] FATAL System shutdown initiated',
      '[2024-01-15 10:24:00] INFO Backup procedures activated',
      '[2024-01-15 10:24:01] DEBUG Saving application state',
      '[2024-01-15 10:24:02] INFO State saved successfully',
      '[2024-01-15 10:24:03] WARN Some services may be unavailable',
      '[2024-01-15 10:24:04] INFO Recovery mode enabled',
    ]

    // Create more sample data
    const extendedLines: Array<string> = []
    for (let i = 0; i < 100; i++) {
      extendedLines.push(
        ...sampleLines.map((line) =>
          line.replace(
            '10:23:',
            `10:${String(23 + Math.floor(i / 60)).padStart(2, '0')}:`,
          ),
        ),
      )
    }

    setLines(extendedLines)
    setFileInfo({
      name: 'sample.log',
      size: extendedLines.join('\n').length,
      lastModified: Date.now(),
      extension: 'log',
    })
  }

  // Keyboard shortcuts
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef?.focus()
      }

      if (e.key === 'Escape') {
        setSearchQuery('')
        searchInputRef?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Load sample data for demo
    loadSampleData()

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  })

  return (
    <div class="flex h-screen flex-col select-none bg-[#1e1e1e]">
      <FileOperationsErrorBoundary>
        <AppHeader
          viewMode={viewMode()}
          setViewMode={setViewMode}
          isStreaming={isStreaming()}
          watchPattern={watchPattern()}
          setWatchPattern={setWatchPattern}
          totalLines={lines().length}
          progress={progress()}
          fileName={fileInfo()?.name || null}
          fileSize={fileInfo()?.size || 0}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onFileSelect={handleFileSelect}
          onOpenWatchModal={() => setShowWatchModal(true)}
          onOpenSettings={() => setShowSettings(true)}
          onSearchFocus={() => searchInputRef?.focus()}
        />
      </FileOperationsErrorBoundary>

      <SearchErrorBoundary>
        <SearchBar
          query={searchQuery()}
          setQuery={setSearchQuery}
          regexMode={searchOptions().isRegex}
          setRegexMode={(isRegex) =>
            setSearchOptions((prev) => ({ ...prev, isRegex }))
          }
          caseSensitive={searchOptions().caseSensitive}
          setCaseSensitive={(caseSensitive) =>
            setSearchOptions((prev) => ({ ...prev, caseSensitive }))
          }
          wholeWord={searchOptions().wholeWord}
          setWholeWord={(wholeWord) =>
            setSearchOptions((prev) => ({ ...prev, wholeWord }))
          }
          resultsCount={searchResults().count}
          currentResultIndex={searchResults().currentIndex}
          onNext={handleNextSearch}
          onPrev={handlePrevSearch}
          onOpenHighlights={() => console.log('Open highlights modal')}
          inputRef={searchInputRef}
        />
      </SearchErrorBoundary>

      <div class="flex-1 flex overflow-hidden">
        <div class="flex-1 overflow-hidden">
          <LogViewerErrorBoundary>
            <LogViewer
              lines={lines()}
              viewSettings={viewSettings()}
              searchOptions={{
                query: searchQuery(),
                isRegex: searchOptions().isRegex,
                isCaseSensitive: searchOptions().caseSensitive,
                isWholeWord: searchOptions().wholeWord,
              }}
              onSearchMatchesChanged={handleSearchMatchesChanged}
              customHighlights={highlightRules()}
              markers={markers()}
              onAddMarker={handleAddMarker}
              onUserScroll={(isAtBottom) => {
                if (isAtBottom && viewMode() === 'follow') {
                  // Keep following
                }
              }}
            />
          </LogViewerErrorBoundary>
        </div>

        {/* Right Panel - Markers */}
        <Show when={isRightPanelOpen()}>
          <div
            class="relative bg-[#252526] border-l border-[#333]"
            style={{ width: `${rightPanelWidth()}px` }}
          >
            <div
              class="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/30 transition-colors"
              onMouseDown={onMouseDownRight}
            />
            <div class="p-4 h-full overflow-auto">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-medium text-gray-300">
                  Markers ({markers().length})
                </h3>
                <button
                  onClick={() => setIsRightPanelOpen(false)}
                  class="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <PanelRightClose size={16} />
                </button>
              </div>

              <div class="space-y-2">
                <For each={markers()}>
                  {(marker) => (
                    <div
                      class="p-3 bg-[#1e1e1e] rounded border border-[#333] hover:border-[#555] transition-colors cursor-pointer"
                      onClick={() => {
                        // Scroll to marker in viewer
                        console.log('Scroll to marker:', marker.id)
                      }}
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs text-gray-500">
                          Line {marker.range.startLineNumber}
                        </span>
                        <span class="text-xs text-gray-600">
                          {new Date(marker.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div class="text-sm text-gray-300 font-mono truncate">
                        {marker.selectedText}
                      </div>
                      <div class="text-xs text-gray-500 mt-1 truncate">
                        {marker.contextLine}
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <Show when={markers().length === 0}>
                <div class="text-center text-gray-500 text-sm mt-8">
                  <p>No markers yet</p>
                  <p class="text-xs mt-1">
                    Select text in the log to create a marker
                  </p>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Right Panel Toggle */}
        <Show when={!isRightPanelOpen()}>
          <button
            onClick={() => setIsRightPanelOpen(true)}
            class="fixed right-4 top-1/2 transform -translate-y-1/2 bg-[#252526] hover:bg-[#333] border border-[#555] rounded-l p-2 text-gray-400 hover:text-white transition-all"
            title="Show Markers Panel"
          >
            <PanelRightOpen size={16} />
          </button>
        </Show>
      </div>

      {/* Bottom Panel */}
      <div
        class="relative w-full bg-[#252526] border-t border-[#333]"
        style={{ height: `${bottomHeight()}px` }}
      >
        <div
          class="absolute left-0 right-0 top-0 h-2 cursor-ns-resize hover:bg-black/20 flex justify-center w-full items-center group"
          onMouseDown={onMouseDownBottom}
        >
          <GripHorizontal
            size={16}
            class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500"
          />
        </div>
        <div class="overflow-auto pt-4 p-4 h-full">
          <div class="text-sm text-gray-400">
            <h4 class="font-medium mb-2">Log Analysis</h4>
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span class="text-gray-500">Total Lines: </span>
                <span class="text-gray-300">
                  {lines().length.toLocaleString()}
                </span>
              </div>
              <div>
                <span class="text-gray-500">Markers: </span>
                <span class="text-gray-300">{markers().length}</span>
              </div>
              <div>
                <span class="text-gray-500">Search Results: </span>
                <span class="text-gray-300">{searchResults().count}</span>
              </div>
              <div>
                <span class="text-gray-500">View Mode: </span>
                <span class="text-gray-300 capitalize">{viewMode()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModalErrorBoundary>
        <SettingsModal
          isOpen={showSettings()}
          onClose={() => setShowSettings(false)}
        />
      </ModalErrorBoundary>

      <ModalErrorBoundary>
        <ShortcutsModal
          isOpen={showShortcuts()}
          onClose={() => setShowShortcuts(false)}
        />
      </ModalErrorBoundary>

      <ModalErrorBoundary>
        <WatchModal
          isOpen={showWatchModal()}
          onClose={() => setShowWatchModal(false)}
          onSetPattern={setWatchPattern}
        />
      </ModalErrorBoundary>
    </div>
  )
}

// Modal components
function SettingsModal(props: { isOpen: boolean; onClose: () => void }) {
  return (
    <div
      class={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${props.isOpen ? 'block' : 'hidden'}`}
    >
      <div class="bg-[#252526] border border-[#333] rounded-lg p-6 w-96">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-200">Settings</h3>
          <button
            onClick={props.onClose}
            class="text-gray-500 hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        <p class="text-gray-400">Settings panel to be implemented...</p>
      </div>
    </div>
  )
}

function ShortcutsModal(props: { isOpen: boolean; onClose: () => void }) {
  return (
    <div
      class={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${props.isOpen ? 'block' : 'hidden'}`}
    >
      <div class="bg-[#252526] border border-[#333] rounded-lg p-6 w-96">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-200">Keyboard Shortcuts</h3>
          <button
            onClick={props.onClose}
            class="text-gray-500 hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        <div class="space-y-2 text-sm text-gray-400">
          <div class="flex justify-between">
            <span>Search:</span>
            <span>Cmd/Ctrl + F</span>
          </div>
          <div class="flex justify-between">
            <span>Next Match:</span>
            <span>Enter</span>
          </div>
          <div class="flex justify-between">
            <span>Previous Match:</span>
            <span>Shift + Enter</span>
          </div>
          <div class="flex justify-between">
            <span>Clear Search:</span>
            <span>Escape</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WatchModal(props: {
  isOpen: boolean
  onClose: () => void
  onSetPattern: (pattern: string) => void
}) {
  const [pattern, setPattern] = createSignal('')

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    props.onSetPattern(pattern())
    props.onClose()
  }

  return (
    <div
      class={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${props.isOpen ? 'block' : 'hidden'}`}
    >
      <div class="bg-[#252526] border border-[#333] rounded-lg p-6 w-96">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-200">Watch Mode</h3>
          <button
            onClick={props.onClose}
            class="text-gray-500 hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label class="block text-sm text-gray-400 mb-2">
            Pattern to watch for:
          </label>
          <input
            type="text"
            value={pattern()}
            onInput={(e) => setPattern(e.currentTarget.value)}
            placeholder="ERROR|WARN|Exception"
            class="w-full bg-[#1e1e1e] border border-[#3e3e3e] rounded px-3 py-2 text-gray-200 mb-4"
          />
          <div class="flex justify-end gap-2">
            <button
              type="button"
              onClick={props.onClose}
              class="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Start Watch
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
