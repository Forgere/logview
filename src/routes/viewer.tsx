import { createFileRoute } from '@tanstack/solid-router'
import {
  ErrorBoundary,
  For,
  Show,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import {
  GripHorizontal,
  PanelRightClose,
  PanelRightOpen,
  X,
} from 'lucide-solid'
import type {
  HighlightRule,
  LogMarker,
  ViewMode,
  ViewSettings,
} from '~/types'
import { AppHeader } from '~/components/Viewer/AppHeader'
import { SearchBar } from '~/components/Viewer/SearchBar'
import { LogViewer } from '~/components/Viewer/LogViewer'
import { DragUpload } from '~/components/Viewer/DragUpload'
import { LogProvider, useLog } from '~/stores/logStore'
import { SearchProvider, useSearch } from '~/stores/searchStore'
import { DEFAULT_HIGHLIGHT_RULES, DEFAULT_VIEW_SETTINGS } from '~/types'

export const Route = createFileRoute('/viewer')({
  component: () => (
    <LogProvider>
      <SearchProvider>
        <RouteComponent />
      </SearchProvider>
    </LogProvider>
  ),
})

function RouteComponent() {
  const { state: logState, actions: logActions, setMonacoEditor } = useLog()
  const [searchState, searchActions, searchDerived] = useSearch()
  // Layout state
  const [bottomHeight, setBottomHeight] = createSignal(200)
  const [rightPanelWidth, setRightPanelWidth] = createSignal(300)
  const [isRightPanelOpen, setIsRightPanelOpen] = createSignal(false)

  // Virtual scrolling state
  const [visibleRange, setVisibleRange] = createSignal({
    start: 0,
    end: 1000, // Initial visible lines
  })
  const LINE_HEIGHT = 20 // Approximate line height in pixels
  const VISIBLE_BUFFER = 50 // Extra lines to render for smooth scrolling

  // Optimize: Derived signals for virtual scrolling - Use line count from the log store state
  const totalLines = createMemo(() => {
    return logState.lineCount;
  })

  // Viewer state - Use logState as single source of truth with direct updates
  // View mode is now always 'browse', so no mode switching


  const [viewSettings] = createSignal<ViewSettings>(DEFAULT_VIEW_SETTINGS)

  // Marker state
  const [markers, setMarkers] = createSignal<Array<LogMarker>>([])
  const [highlightRules] = createSignal<Array<HighlightRule>>(
    DEFAULT_HIGHLIGHT_RULES,
  )

  // Modals and UI state
  const [showSettings, setShowSettings] = createSignal(false)
  const [showShortcuts, setShowShortcuts] = createSignal(false)

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
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
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
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
  }

  // Optimize: Virtual scroll handler
  const handleVirtualScroll = (scrollTop: number) => {
    const containerHeight = 600
    const firstVisibleLine = Math.floor(scrollTop / LINE_HEIGHT)
    const visibleLineCount = Math.ceil(containerHeight / LINE_HEIGHT)

    // Calculate visible range with buffer
    const start = Math.max(0, firstVisibleLine - VISIBLE_BUFFER)
    const end = Math.min(
      totalLines(),
      firstVisibleLine + visibleLineCount + VISIBLE_BUFFER,
    )

    // Only update if range actually changed
    const currentRange = visibleRange()
    if (start !== currentRange.start || end !== currentRange.end) {
      setVisibleRange({ start, end })
    }
  }

  // Optimize: File handling using log store
  const handleFileSelect = (file: File) => {
    // Reset virtual scrolling state
    setVisibleRange({ start: 0, end: 1000 })

    // Use the log store's loadFile action instead of custom implementation
    logActions.loadFile(file, viewSettings().newLineConfig)
  }

  // Search functionality - since content is in Monaco now, we'll handle search updates differently
  // For now, we don't need to sync search store with log store lines since search is handled in Monaco

  // Handle search navigation using search store and Monaco integration
  const handleNextSearch = () => {
    // Use search store for navigation
    searchActions.nextMatch()
  }

  const handlePrevSearch = () => {
    // Use search store for navigation
    searchActions.prevMatch()
  }

  // Handle search options changes
  const handleRegexModeChange = (isRegex: boolean) => {
    searchActions.setIsRegex(isRegex)
  }

  const handleCaseSensitiveChange = (caseSensitive: boolean) => {
    searchActions.setCaseSensitive(caseSensitive)
  }

  const handleWholeWordChange = (wholeWord: boolean) => {
    searchActions.setWholeWord(wholeWord)
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

  // Handle text selection from LogViewer
  const handleSelectionChange = (_selection: { text: string; range: any; line: string } | null) => {
    // Currently we don't store selected text separately
  }

  // Keyboard shortcuts
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        searchActions.setQuery('')
        searchInputRef?.blur()
      }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        if (typeof window !== 'undefined' && window.removeEventListener) {
          window.removeEventListener('keydown', handleKeyDown);
        }
      };
    } else {
      return () => {}; // Return empty cleanup function when window is not available
    }
  })

  return (
    <div class="flex h-screen flex-col select-none bg-[#1e1e1e]">
      <ErrorBoundary
        fallback={(err) => (
          <div class="p-4 bg-red-600 text-white">
            <h2 class="font-bold mb-2">An error occurred:</h2>
            <pre class="whitespace-pre-wrap">{err.message}</pre>
          </div>
        )}
      >
        <AppHeader
          viewMode={logState.viewMode}
          isStreaming={logState.progress < 100} // File is still loading
          onTogglePause={logActions.togglePause}
          totalLines={totalLines()}
          progress={logState.progress}
          fileName={logState.file?.name || null}
          fileSize={logState.file?.size || 0}
          onOpenShortcuts={() => setShowShortcuts(true)}
          onFileSelect={handleFileSelect}
          onOpenSettings={() => setShowSettings(true)}
          onSearchFocus={() => searchInputRef?.focus()}
        />

        <SearchBar
          query={searchDerived.searchQuery()}
          setQuery={searchActions.setQuery}
          regexMode={searchState.options.isRegex}
          setRegexMode={handleRegexModeChange}
          caseSensitive={searchState.options.caseSensitive}
          setCaseSensitive={handleCaseSensitiveChange}
          wholeWord={searchState.options.wholeWord}
          setWholeWord={handleWholeWordChange}
          resultsCount={searchDerived.resultsCount()}
          currentResultIndex={searchState.currentMatchIndex}
          onNext={handleNextSearch}
          onPrev={handlePrevSearch}
          onOpenHighlights={() => console.log('Open highlights modal')}
          inputRef={searchInputRef}
        />

        <div class="flex-1 flex overflow-hidden">
          <div class="flex-1 overflow-hidden">
            <LogViewer
              viewSettings={viewSettings()}
              searchOptions={{
                query: searchDerived.searchQuery(),
                isRegex: searchState.options.isRegex,
                isCaseSensitive: searchState.options.caseSensitive,
                isWholeWord: searchState.options.wholeWord,
              }}
              onSearchMatchesChanged={() => {
                /* No-op - using search store now */
              }}
              onMonacoReady={(monacoIntegration, editor) => {
                setMonacoEditor(editor)
                searchActions.setMonacoIntegration(monacoIntegration)
              }}
              customHighlights={highlightRules()}
              markers={markers()}
              onAddMarker={handleAddMarker}
              onSelectionChange={handleSelectionChange}
              onUserScroll={(isAtBottom, scrollTop) => {
                // Handle virtual scrolling only, no following behavior
                handleVirtualScroll(scrollTop || 0)
              }}
              setSearchQuery={searchActions.setQuery}
              focusSearchInput={() => searchInputRef?.focus()}
              updateMatches={searchActions.updateMatches}
            />
          </div>
          <DragUpload onFileSelect={handleFileSelect} hasFiles={totalLines() > 0}>
            {/* Empty div to ensure DragUpload renders properly */}
            <div></div>
          </DragUpload>

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
                    {totalLines().toLocaleString()}
                  </span>
                </div>
                <div>
                  <span class="text-gray-500">Markers: </span>
                  <span class="text-gray-300">{markers().length}</span>
                </div>
                <div>
                  <span class="text-gray-500">Search Results: </span>
                  <span class="text-gray-300">
                    {searchDerived.resultsCount()}
                  </span>
                </div>
                <div>
                  <span class="text-gray-500">View Mode: </span>
                  <span class="text-gray-300 capitalize">{logState.viewMode}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SettingsModal
          isOpen={showSettings()}
          onClose={() => setShowSettings(false)}
        />

        <ShortcutsModal
          isOpen={showShortcuts()}
          onClose={() => setShowShortcuts(false)}
        />

      </ErrorBoundary>
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

