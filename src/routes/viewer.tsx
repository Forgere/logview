import { createFileRoute } from '@tanstack/solid-router'
import {
  ErrorBoundary,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import type { LogLevel, LogMarker, MarkerRange, WatchMode } from '~/types'
import { AppHeader } from '~/components/Viewer/AppHeader'
import { SearchBar } from '~/components/Viewer/SearchBar'
import { LogViewer } from '~/components/Viewer/LogViewer'
import { DragUpload } from '~/components/Viewer/DragUpload'
import { FilterBar } from '~/components/Viewer/FilterBar'
import { StatusBar } from '~/components/Viewer/StatusBar'
import { ConfirmDialog } from '~/components/ui/Modal'
import { ToastHost, toast } from '~/stores/toastStore'
import { LogProvider, useLog } from '~/stores/logStore'
import { SearchProvider, useSearch } from '~/stores/searchStore'
import { ViewProvider, useView } from '~/stores/viewStore'
import {
  UI_KEYS,
  readStored,
  usePersistedSignal,
  writeStored,
} from '~/lib/persist'
import { APP_VERSION } from '~/lib/version'
import { GoToLineModal } from '~/components/modals/GoToLineModal'
import { ShortcutsModal } from '~/components/modals/ShortcutsModal'
import { SettingsModal } from '~/components/modals/SettingsModal'
import { HighlightSettingsModal } from '~/components/modals/HighlightSettingsModal'
import { WatchSettingsModal } from '~/components/modals/WatchSettingsModal'
import { CompareModal } from '~/components/modals/CompareModal'
import { AnalysisModal } from '~/components/modals/AnalysisModal'
import { UpgradeGuideModal } from '~/components/modals/UpgradeGuideModal'
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
  const [isMarkerPanelOpen, setIsMarkerPanelOpen] = usePersistedSignal(
    UI_KEYS.markerPanelOpen,
    true,
  )

  // Modal state
  const [showWatchModal, setShowWatchModal] = createSignal(false)
  const [showSettings, setShowSettings] = createSignal(false)
  const [showShortcuts, setShowShortcuts] = createSignal(false)
  const [showGoToLine, setShowGoToLine] = createSignal(false)
  const [showHighlightSettings, setShowHighlightSettings] = createSignal(false)
  const [showClearConfirm, setShowClearConfirm] = createSignal(false)
  const [showCompare, setShowCompare] = createSignal(false)
  const [showAnalysis, setShowAnalysis] = createSignal(false)
  const [showUpgradeGuide, setShowUpgradeGuide] = createSignal(false)
  const [watchPattern, setWatchPattern] = createSignal('')

  // Persisted as a string array: JSON.stringify turns a Set into {}.
  const [excludedLevelList, setExcludedLevelList] = usePersistedSignal<
    Array<LogLevel>
  >(UI_KEYS.excludedLevels, [])
  const excludedLevels = createMemo(() => new Set(excludedLevelList()))
  const [searchOnly, setSearchOnly] = usePersistedSignal(
    UI_KEYS.searchOnly,
    false,
  )

  const toggleLevel = (level: LogLevel) => {
    setExcludedLevelList((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  // Cursor position for the status bar
  const [cursor, setCursor] = createSignal({ line: 1, column: 1 })

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

  // Optimize: File handling using log store
  const handleFileSelect = (file: File) => {
    // Reset line-filter state on a fresh file
    setExcludedLevelList([])
    setSearchOnly(false)

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
    setShowClearConfirm(true)
  }

  const confirmClearAllMarkers = () => {
    setMarkers([])
    setSelectedMarkerIds(new Set<string>())
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
    toast(`${selected.length} lines copied to clipboard.`, 'success')
  }

  const handleScrollToMarker = (range: MarkerRange) => {
    monacoEditorRef?.revealLineInCenter(range.startLineNumber)
  }

  const handleUpdateMarkerNote = (id: string, note: string) => {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, note } : m)))
  }

  const handleExportMarkers = () => {
    const payload = markers().map((m) => ({
      line: m.range.startLineNumber,
      timestamp: m.timestamp,
      selectedText: m.selectedText,
      contextLine: m.contextLine,
      note: m.note ?? '',
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `markers-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast(`${payload.length} markers exported.`, 'success')
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

  // Show the release notes once per version, only after hydration.
  onMount(() => {
    const seen: string = readStored(UI_KEYS.seenVersion, '')
    if (seen !== APP_VERSION) {
      setShowUpgradeGuide(true)
    }
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
      // Ctrl/Cmd + M - Toggle matches-only view
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        setSearchOnly((v) => !v)
        return
      }

      // F2 - Jump to next/previous marker (Shift+F2 = previous)
      if (e.key === 'F2') {
        e.preventDefault()
        const list = markers()
        if (list.length === 0) return
        const current = cursor().line
        const sorted = [...list].sort(
          (a, b) => a.range.startLineNumber - b.range.startLineNumber,
        )
        const target = e.shiftKey
          ? [...sorted].reverse().find((m) => m.range.startLineNumber < current)
          : sorted.find((m) => m.range.startLineNumber > current)
        const pick = target ?? sorted[0]
        monacoEditorRef?.revealLineInCenter(pick.range.startLineNumber)
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

    window.addEventListener('keydown', handleKeyDown)

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })
  })

  return (
    <div class="flex h-screen flex-col select-none bg-background">
      <ErrorBoundary
        fallback={(err) => (
          <div class="p-4 bg-destructive text-destructive-foreground">
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
          onOpenUpgradeGuide={() => setShowUpgradeGuide(true)}
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
        <FilterBar
          counts={logState.levelCounts}
          excluded={excludedLevels()}
          onToggleLevel={toggleLevel}
          searchOnly={searchOnly()}
          onToggleSearchOnly={() => setSearchOnly((v) => !v)}
          matchCount={searchDerived.resultsCount()}
          hasQuery={Boolean(searchDerived.searchQuery())}
        />

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="flex-1 overflow-hidden relative">
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
              setSearchQuery={searchActions.setQuery}
              focusSearchInput={() => searchInputRef?.focus()}
              updateMatches={searchActions.updateMatches}
              onGoToLine={() => setShowGoToLine(true)}
              excludedLevels={excludedLevels}
              searchOnly={searchOnly}
              onCursorChange={(line, column) => setCursor({ line, column })}
            />

            <StatusBar
              line={cursor().line}
              column={cursor().column}
              totalLines={totalLines()}
              progress={logState.progress}
              isStreaming={logState.isStreaming}
              counts={logState.levelCounts}
            />

            <DragUpload
              onFileSelect={handleFileSelect}
              hasFiles={totalLines() > 0}
            >
              {/* Empty div to ensure DragUpload renders properly */}
              <div></div>
            </DragUpload>
          </div>

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
            onUpdateNote={handleUpdateMarkerNote}
            onExport={handleExportMarkers}
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

        <UpgradeGuideModal
          isOpen={showUpgradeGuide()}
          onClose={() => {
            setShowUpgradeGuide(false)
            writeStored(UI_KEYS.seenVersion, APP_VERSION)
          }}
        />

        <ConfirmDialog
          isOpen={showClearConfirm()}
          onClose={() => setShowClearConfirm(false)}
          onConfirm={confirmClearAllMarkers}
          title="Clear all markers"
          message="This will remove every bookmark. This cannot be undone."
          confirmLabel="Clear all"
        />

        <ToastHost />
      </ErrorBoundary>
    </div>
  )
}
