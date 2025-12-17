import { createFileRoute } from '@tanstack/solid-router'
import {
  ErrorBoundary,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import type { LogMarker, MarkerRange, WatchMode } from '~/types'
import { AppHeader } from '~/components/Viewer/AppHeader'
import { SearchBar } from '~/components/Viewer/SearchBar'
import { LogViewer } from '~/components/Viewer/LogViewer'
import { DragUpload } from '~/components/Viewer/DragUpload'
import { LogProvider, useLog } from '~/stores/logStore'
import { SearchProvider, useSearch } from '~/stores/searchStore'
import { ViewProvider, useView } from '~/stores/viewStore'
import { GoToLineModal } from '~/components/modals/GoToLineModal'
import { ShortcutsModal } from '~/components/modals/ShortcutsModal'
import { SettingsModal } from '~/components/modals/SettingsModal'
import { HighlightSettingsModal } from '~/components/modals/HighlightSettingsModal'
import { WatchSettingsModal } from '~/components/modals/WatchSettingsModal'
import { CompareModal } from '~/components/modals/CompareModal'
import { AnalysisModal } from '~/components/modals/AnalysisModal'
import { MarkerPanel } from '~/components/panels/MarkerPanel'

export const Route = createFileRoute('/viewer')({
  component: () => (
    <LogProvider>
      <SearchProvider>
        <ViewProvider>
          <RouteComponent />
        </ViewProvider>
      </SearchProvider>
    </LogProvider>
  ),
})

function RouteComponent() {
  const {
    state: logState,
    actions: logActions,
    setMonacoEditor,
    setWatchMatchCallback,
  } = useLog()
  const [searchState, searchActions, searchDerived] = useSearch()
  const [viewState, viewActions] = useView()

  // Layout state
  const [isMarkerPanelOpen, setIsMarkerPanelOpen] = createSignal(true)

  // Modal state
  const [showWatchModal, setShowWatchModal] = createSignal(false)
  const [showSettings, setShowSettings] = createSignal(false)
  const [showShortcuts, setShowShortcuts] = createSignal(false)
  const [showGoToLine, setShowGoToLine] = createSignal(false)
  const [showHighlightSettings, setShowHighlightSettings] = createSignal(false)
  const [showCompare, setShowCompare] = createSignal(false)
  const [showAnalysis, setShowAnalysis] = createSignal(false)

  // Watch state
  const [watchPattern, setWatchPattern] = createSignal('')

  // Virtual scrolling state
  const [visibleRange, setVisibleRange] = createSignal({
    start: 0,
    end: 1000, // Initial visible lines
  })
  const LINE_HEIGHT = 20 // Approximate line height in pixels
  const VISIBLE_BUFFER = 50 // Extra lines to render for smooth scrolling

  // Optimize: Derived signals for virtual scrolling - Use line count from the log store state
  const totalLines = createMemo(() => {
    return logState.lineCount
  })

  // Viewer state - Use logState as single source of truth with direct updates
  // View mode is now always 'browse', so no mode switching

  // Marker state
  const [markers, setMarkers] = createSignal<Array<LogMarker>>([])
  const [selectedMarkerIds, setSelectedMarkerIds] = createSignal<Set<string>>(
    new Set(),
  )

  let searchInputRef: HTMLInputElement | undefined
  let monacoEditorRef: any = null

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

    // Load config for file extension
    viewActions.loadForFile(file.name)

    // Use the log store's loadFile action instead of custom implementation
    logActions.loadFile(file, viewState.settings.newLineConfig)
  }

  // Watch mode handler
  const handleStartWatch = (pattern: string, mode: WatchMode) => {
    setWatchPattern(pattern)
    logActions.setWatchPattern(pattern)
    logActions.setWatchMode(mode)
    logActions.startWatch()
  }

  const handleStopWatch = () => {
    logActions.stopWatch()
    setWatchPattern('')
  }

  // View mode toggle handler
  const handleToggleViewMode = () => {
    const newMode = logState.viewMode === 'follow' ? 'browse' : 'follow'
    logActions.setViewMode(newMode)
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
      timestamp: new Date().toLocaleTimeString(),
    }

    setMarkers((prev) => [...prev, newMarker])
    if (!isMarkerPanelOpen()) {
      setIsMarkerPanelOpen(true)
    }
  }

  const handleDeleteMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id))
    setSelectedMarkerIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleBulkDeleteMarkers = () => {
    const idsToDelete = selectedMarkerIds()
    setMarkers((prev) => prev.filter((m) => !idsToDelete.has(m.id)))
    setSelectedMarkerIds(new Set<string>())
  }

  const handleClearAllMarkers = () => {
    if (confirm('Delete all markers?')) {
      setMarkers([])
      setSelectedMarkerIds(new Set<string>())
    }
  }

  const handleToggleSelectMarker = (id: string) => {
    setSelectedMarkerIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllMarkers = () => {
    setSelectedMarkerIds(new Set(markers().map((m) => m.id)))
  }

  const handleDeselectAllMarkers = () => {
    setSelectedMarkerIds(new Set<string>())
  }

  const handleCopyMarkers = () => {
    const selectedIds = selectedMarkerIds()
    const selected = markers().filter((m) => selectedIds.has(m.id))
    const text = selected
      .map((m) => `[Line ${m.range.startLineNumber}] ${m.contextLine}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    alert(`${selected.length} lines copied to clipboard.`)
  }

  const handleScrollToMarker = (range: MarkerRange) => {
    monacoEditorRef?.revealLineInCenter(range.startLineNumber)
  }

  // Handle text selection from LogViewer
  const handleSelectionChange = (
    _selection: { text: string; range: any; line: string } | null,
  ) => {
    // Currently we don't store selected text separately
  }

  // Set up watch match callback to add markers when watch mode matches
  onMount(() => {
    setWatchMatchCallback((lineNumber: number, line: string) => {
      // Add markers for both MARK_ONLY and PAUSE_ALL modes
      const newMarker: LogMarker = {
        id: `watch-${Date.now()}-${lineNumber}`,
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: line.length + 1,
        },
        selectedText: line,
        contextLine: line,
        timestamp: new Date().toLocaleTimeString(),
        note: `Watch match: "${logState.watch.pattern}"`,
      }

      setMarkers((prev) => [...prev, newMarker])

      // Auto-open marker panel if not open
      if (!isMarkerPanelOpen()) {
        setIsMarkerPanelOpen(true)
      }
    })

    onCleanup(() => {
      setWatchMatchCallback(null)
    })
  })

  // Keyboard shortcuts
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + G - Go to line
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        setShowGoToLine(true)
        return
      }

      // Shift + ? - Show shortcuts
      if (e.shiftKey && e.key === '?') {
        // Only if not in an input field
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault()
          setShowShortcuts(true)
          return
        }
      }

      // Escape - Close modals or clear search
      if (e.key === 'Escape') {
        if (showGoToLine()) {
          setShowGoToLine(false)
          return
        }
        if (showShortcuts()) {
          setShowShortcuts(false)
          return
        }
        if (showSettings()) {
          setShowSettings(false)
          return
        }
        if (showHighlightSettings()) {
          setShowHighlightSettings(false)
          return
        }
        if (showWatchModal()) {
          setShowWatchModal(false)
          return
        }
        if (showCompare()) {
          setShowCompare(false)
          return
        }
        if (showAnalysis()) {
          setShowAnalysis(false)
          return
        }
        // Clear search
        searchActions.setQuery('')
        searchInputRef?.blur()
      }
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('keydown', handleKeyDown)

      onCleanup(() => {
        window.removeEventListener('keydown', handleKeyDown)
      })
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
          isStreaming={logState.isStreaming}
          onTogglePause={logActions.togglePause}
          onToggleViewMode={handleToggleViewMode}
          watchPattern={logState.watch.pattern}
          watchActive={logState.watch.isActive}
          onStopWatch={handleStopWatch}
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
          onOpenHighlights={() => setShowHighlightSettings(true)}
          inputRef={searchInputRef}
        />

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="flex-1 overflow-hidden">
            <LogViewer
              viewSettings={viewState.settings}
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
                monacoEditorRef = editor
                setMonacoEditor(editor)
                searchActions.setMonacoIntegration(monacoIntegration)
              }}
              customHighlights={viewState.highlightRules}
              markers={markers()}
              onAddMarker={handleAddMarker}
              onSelectionChange={handleSelectionChange}
              onUserScroll={(_isAtBottom, scrollTop) => {
                // Handle virtual scrolling only, no following behavior
                handleVirtualScroll(scrollTop || 0)
              }}
              setSearchQuery={searchActions.setQuery}
              focusSearchInput={() => searchInputRef?.focus()}
              updateMatches={searchActions.updateMatches}
            />
          </div>
          <DragUpload
            onFileSelect={handleFileSelect}
            hasFiles={totalLines() > 0}
          >
            {/* Empty div to ensure DragUpload renders properly */}
            <div></div>
          </DragUpload>

          {/* Marker Panel - Bottom */}
          <MarkerPanel
            isOpen={isMarkerPanelOpen()}
            setIsOpen={setIsMarkerPanelOpen}
            markers={markers()}
            selectedIds={selectedMarkerIds()}
            onToggleSelect={handleToggleSelectMarker}
            onSelectAll={handleSelectAllMarkers}
            onDeselectAll={handleDeselectAllMarkers}
            onAnalyze={() => setShowAnalysis(true)}
            onCompare={() => setShowCompare(true)}
            onCopy={handleCopyMarkers}
            onDelete={handleBulkDeleteMarkers}
            onDeleteMarker={handleDeleteMarker}
            onClearAll={handleClearAllMarkers}
            onScrollTo={handleScrollToMarker}
            onOpenWatch={() => setShowWatchModal(true)}
          />
        </div>

        {/* Modals */}
        <GoToLineModal
          isOpen={showGoToLine()}
          onClose={() => setShowGoToLine(false)}
          maxLine={totalLines()}
          onGo={(lineNumber) => {
            monacoEditorRef?.revealLineInCenter(lineNumber)
          }}
        />

        <ShortcutsModal
          isOpen={showShortcuts()}
          onClose={() => setShowShortcuts(false)}
        />

        <SettingsModal
          isOpen={showSettings()}
          onClose={() => setShowSettings(false)}
          viewSettings={viewState.settings}
          setViewSettings={(settings) => viewActions.updateSettings(settings)}
          currentExtension={viewState.currentExtension}
        />

        <HighlightSettingsModal
          isOpen={showHighlightSettings()}
          onClose={() => setShowHighlightSettings(false)}
          rules={viewState.highlightRules}
          setRules={(rules) => {
            // Clear existing and set new rules
            viewState.highlightRules.forEach((r) =>
              viewActions.removeHighlightRule(r.id),
            )
            rules.forEach((r) => viewActions.addHighlightRule(r))
          }}
        />

        <WatchSettingsModal
          isOpen={showWatchModal()}
          onClose={() => setShowWatchModal(false)}
          onStartWatch={handleStartWatch}
          currentPattern={watchPattern()}
        />

        <CompareModal
          isOpen={showCompare()}
          onClose={() => setShowCompare(false)}
          markers={markers()}
          selectedIds={selectedMarkerIds()}
        />

        <AnalysisModal
          isOpen={showAnalysis()}
          onClose={() => setShowAnalysis(false)}
          markers={markers()}
          selectedIds={selectedMarkerIds()}
        />
      </ErrorBoundary>
    </div>
  )
}
