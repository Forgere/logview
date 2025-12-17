import { Show, batch, createEffect, createMemo, createSignal, on } from 'solid-js'
import { Bookmark } from 'lucide-solid'
import type {
  HighlightRule,
  LogMarker,
  MarkerRange,
  SearchMatch,
  ViewSettings,
} from '~/types'
import { useMonacoEditor } from '~/hooks/useMonacoEditor'
import { LogViewerErrorBoundary } from '~/components/ErrorBoundary'

import type * as monaco from 'monaco-editor'
import { useSearch } from '~/stores'

interface SearchOptions {
  query: string
  isRegex: boolean
  isCaseSensitive: boolean
  isWholeWord: boolean
}

interface LogViewerProps {
  viewSettings: ViewSettings
  searchOptions: SearchOptions
  onSearchMatchesChanged?: (count: number, current: number) => void
  customHighlights?: Array<HighlightRule>
  markers: Array<LogMarker>
  onAddMarker: (range: MarkerRange, text: string, context: string) => void
  onUserScroll?: (isAtBottom: boolean, scrollTop?: number) => void
  onSelectionChange?: (
    selection: { text: string; range: any; line: string } | null,
  ) => void
  onMonacoReady?: (monacoIntegration: any, editor: monaco.editor.IStandaloneCodeEditor | null) => void
  // Search functions
  setSearchQuery?: (query: string) => void
  focusSearchInput?: () => void
  updateMatches?: (lines?: Array<SearchMatch>) => void
}

export function LogViewer(props: LogViewerProps) {
  let containerRef: HTMLDivElement | undefined
  let editorContainerRef: HTMLDivElement | undefined

  const [searchMatches, setSearchMatches] = createSignal<Array<SearchMatch>>([])
  const [markerLines, setMarkerLines] = createSignal<Array<number>>([])
  const [floatingBtn, setFloatingBtn] = createSignal<{
    x: number
    y: number
    range: any
    text: string
  } | null>(null)

  // Get search store for syncing currentMatchIndex
  const [searchState, searchActions] = useSearch()

  // Use searchStore's currentMatchIndex for decorations
  const currentMatchIndex = createMemo(() => searchState.currentMatchIndex)

  // Optimize: Update marker lines with batch updates
  createEffect(
    on(
      () => props.markers,
      (markers) => {
        batch(() => {
          const lines = new Set<number>()
          markers.forEach((marker) => {
            for (
              let i = marker.range.startLineNumber;
              i <= marker.range.endLineNumber;
              i++
            ) {
              lines.add(i)
            }
          })
          setMarkerLines(Array.from(lines))
        })
      },
      { defer: true },
    ),
  )

  // Monaco editor setup
  const monacoAPI = useMonacoEditor(() => editorContainerRef, {
    content: () => "",  // Provide empty content since it will be managed directly
    settings: () => props.viewSettings,
    highlightRules: () => props.customHighlights || [],
    searchMatches,
    currentMatchIndex,
    markerLines,
    onSelectionChange: (selection) => {
      if (selection && props.onSelectionChange) {
        props.onSelectionChange(selection)
      }

      // Handle floating button for marker creation
      if (selection && selection.text.trim()) {
        // Check for overlap with existing markers
        const hasOverlap = props.markers.some((marker) => {
          const markerRange = {
            startLineNumber: marker.range.startLineNumber,
            startColumn: marker.range.startColumn,
            endLineNumber: marker.range.endLineNumber,
            endColumn: marker.range.endColumn,
          }

          // Simple overlap check - in real implementation would use monaco.Range.intersectRanges
          return (
            markerRange.startLineNumber <= selection.range.endLineNumber &&
            markerRange.endLineNumber >= selection.range.startLineNumber
          )
        })

        if (!hasOverlap) {
          // Get editor position for floating button
          const editor = monacoAPI.editor()
          const monaco = monacoAPI.monaco()
          if (editor && monaco) {
            // Create a position at the end of the selection range
            const position = new monaco.Position(
              selection.range.endLineNumber,
              selection.range.endColumn,
            )
            const scrolledVisiblePos =
              editor.getScrolledVisiblePosition(position)

            if (scrolledVisiblePos) {
              setFloatingBtn({
                x: scrolledVisiblePos.left + 50,
                y: scrolledVisiblePos.top - 10,
                range: selection.range,
                text: selection.text,
              })
              return
            }
          }
        }
      }

      setFloatingBtn(null)
    },
    onScroll: (scrollTop) => {
      if (props.onUserScroll) {
        const editor = monacoAPI.editor()
        if (editor) {
          const maxScroll =
            editor.getScrollHeight() - editor.getLayoutInfo().height
          const isAtBottom = maxScroll - scrollTop < 20
          props.onUserScroll(isAtBottom, scrollTop)
        }
      }
    },
    // Pass search functions to Monaco editor from props
    setSearchQuery: props.setSearchQuery,
    focusSearchInput: props.focusSearchInput,
    // Search navigation callbacks
    onSearchNext: () => searchActions.nextMatch(),
    onSearchPrev: () => searchActions.prevMatch(),
    onCreate: (editor) => {
      if (props.onMonacoReady) {
        const monacoIntegration = {
          findNext: monacoAPI.findNext,
          findPrevious: monacoAPI.findPrevious,
          scrollToLine: monacoAPI.scrollToLine,
        }
        props.onMonacoReady(monacoIntegration, editor)
      }
    }
  })

  createEffect(
    on(
      () => [
        searchMatches(),
      ],
      ([
        matches,
      ]) => {
        props.updateMatches?.(
          matches
        )
      }
    )
  )

  // Optimize: Search functionality with proper dependency tracking
  createEffect(
    on(
      () =>
        [
          props.searchOptions.query,
          props.searchOptions.isRegex,
          props.searchOptions.isCaseSensitive,
          props.searchOptions.isWholeWord,
        ] as const,
      ([query, isRegex, isCaseSensitive, isWholeWord]) => {
        if (!query || !monacoAPI.editor()) {
          batch(() => {
            setSearchMatches([])
            searchActions.goToMatch(0)
            props.onSearchMatchesChanged?.(0, -1)
          })
          return
        }

        const editor = monacoAPI.editor()!
        const model = editor.getModel()
        if (!model) return

        try {
          const matches = model.findMatches(
            isWholeWord ? `/\\b${query}\\b/` : query,
            false,
            isWholeWord || isRegex,
            isCaseSensitive,
            isWholeWord ? null : '',
            true,
            Number.MAX_SAFE_INTEGER
          )

          const searchMatchesList: Array<SearchMatch> = matches.map(
            (match, index) => ({
              lineIndex: match.range.startLineNumber - 1,
              startColumn: match.range.startColumn - 1,
              endColumn: match.range.endColumn - 1,
              matchIndex: index,
            }),
          )

          batch(() => {
            setSearchMatches(searchMatchesList)
            searchActions.goToMatch(searchMatchesList.length > 0 ? 0 : 0)
            props.onSearchMatchesChanged?.(
              searchMatchesList.length,
              searchMatchesList.length > 0 ? 0 : -1,
            )
          })

          // Highlight first match
          if (searchMatchesList.length > 0) {
            const firstMatch = matches[0]
            editor.revealRangeInCenter(firstMatch.range)
          }
        } catch (error) {
          console.error('Search error:', error)
          batch(() => {
            setSearchMatches([])
            searchActions.goToMatch(0)
            props.onSearchMatchesChanged?.(0, -1)
          })
        }
      },
      { defer: true },
    ),
  )

  const handleMarkClick = () => {
    const btn = floatingBtn()
    if (btn) {
      const editor = monacoAPI.editor()
      if (editor) {
        const model = editor.getModel()
        if (model) {
          const context = model.getLineContent(btn.range.startLineNumber)
          const newRange: MarkerRange = {
            startLineNumber: btn.range.startLineNumber,
            startColumn: btn.range.startColumn,
            endLineNumber: btn.range.endLineNumber,
            endColumn: btn.range.endColumn,
          }

          props.onAddMarker(newRange, btn.text, context)
          setFloatingBtn(null)

          // Clear selection
          editor.setSelection(
            new (monacoAPI.monaco()!.Range)(
              btn.range.endLineNumber,
              btn.range.endColumn,
              btn.range.endLineNumber,
              btn.range.endColumn,
            ),
          )
        }
      }
    }
  }

  return (
    <LogViewerErrorBoundary>
      <div
        ref={containerRef}
        class="h-full w-full overflow-hidden bg-[#1e1e1e] relative"
      >
        <div ref={editorContainerRef} class="h-full w-full" />

        <Show when={floatingBtn()}>
          <div
            class="absolute z-50 floating-btn-anim"
            style={{
              top: floatingBtn()!.y + 'px',
              left: floatingBtn()!.x + 'px',
            }}
          >
            <button
              onClick={handleMarkClick}
              class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium transition-transform active:scale-95"
            >
              <Bookmark size={12} fill="currentColor" />
              Mark Selection
            </button>
          </div>
        </Show>
      </div>
    </LogViewerErrorBoundary>
  )
}
