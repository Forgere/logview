import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js'
import loader from '@monaco-editor/loader'
import type { Accessor } from 'solid-js'
import type * as monaco from 'monaco-editor'
import type { HighlightRule, SearchMatch, ViewSettings } from '~/types'

export interface UseMonacoEditorOptions {
  content: Accessor<string>
  settings: Accessor<ViewSettings>
  highlightRules: Accessor<Array<HighlightRule>>
  searchMatches: Accessor<Array<SearchMatch>>
  currentMatchIndex: Accessor<number>
  markerLines: Accessor<Array<number>>
  onSelectionChange?: (
    selection: {
      text: string
      range: monaco.IRange
      line: string
    } | null,
  ) => void
  onScroll?: (scrollTop: number, visibleRange: monaco.Range) => void
  // Search functionality access
  setSearchQuery?: (query: string) => void
  focusSearchInput?: () => void
  onSearchNext?: () => void
  onSearchPrev?: () => void
  onCreate?: (editor: monaco.editor.IStandaloneCodeEditor) => void
}

export interface MonacoEditorAPI {
  editor: Accessor<monaco.editor.IStandaloneCodeEditor | null>
  monaco: Accessor<typeof monaco | null>
  scrollToLine: (line: number, center?: boolean) => void
  revealLine: (line: number) => void
  getVisibleRange: () => monaco.Range | null
  findNext: (
    query: string,
    options?: any, // Using any since IFindControllerOptions may not be available
  ) => boolean
  findPrevious: (
    query: string,
    options?: any, // Using any since IFindControllerOptions may not be available
  ) => boolean
  getFindState: () => any | null, // Using any since IFindControllerState may not be available，
  onCreate?: (editor: monaco.editor.IStandaloneCodeEditor) => void
}

export function useMonacoEditor(
  container: Accessor<HTMLDivElement | undefined>,
  options: UseMonacoEditorOptions,
): MonacoEditorAPI {
  const [editorInstance, setEditorInstance] =
    createSignal<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [monacoInstance, setMonacoInstance] = createSignal<
    typeof monaco | null
  >(null)

  // Decoration collections for search highlights, markers, etc.
  let searchDecorations: Array<string> = []
  let markerDecorations: Array<string> = []
  let highlightDecorations: Array<string> = []

  onMount(async () => {
    // Configure Monaco loader
    loader.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
      },
    })

    const monaco = await loader.init()
    setMonacoInstance(monaco)

    // Define custom dark theme
    monaco.editor.defineTheme('hyperlog-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'log-error', foreground: 'ff6b6b', fontStyle: 'bold' },
        { token: 'log-warn', foreground: 'facc15' },
        { token: 'log-info', foreground: '94a3b8' },
        { token: 'log-debug', foreground: '6b7280' },
        { token: 'log-timestamp', foreground: '569cd6' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorLineNumber.foreground': '#6b7280',
        'editorLineNumber.activeForeground': '#ffffff',
      },
    })

    // Register log language
    monaco.languages.register({ id: 'logview' })
    monaco.languages.setMonarchTokensProvider('logview', {
      tokenizer: {
        root: [
          [/\[ERROR\]|ERROR|FATAL|CRITICAL/i, 'log-error'],
          [/\[WARN\]|WARN|WARNING/i, 'log-warn'],
          [/\[INFO\]|INFO/i, 'log-info'],
          [/\[DEBUG\]|DEBUG|TRACE/i, 'log-debug'],
          [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/, 'log-timestamp'],
        ],
      },
    })

    const containerEl = container()
    if (!containerEl) return

    const settings = options.settings()

    const ed = monaco.editor.create(containerEl, {
      value: options.content(),
      language: 'logview',
      theme: 'hyperlog-dark',
      readOnly: true,
      fontSize: settings.fontSize,
      lineHeight: settings.rowHeight,
      wordWrap: settings.wrapLines ? 'on' : 'off',
      minimap: { enabled: true, renderCharacters: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      renderLineHighlight: 'line',
      selectOnLineNumbers: true,
      glyphMargin: false,
      folding: false,
      lineNumbers: 'on',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      // Additional options to prevent find widget
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'never',
        seedSearchStringFromSelection: 'never',
      },
      // Disable any find-related contributions
      contributions: [
        'bracketMatching',
        'wordHighlighter',
        'wordOperations',
        'linesOperations',
        'clipboard',
        'editorState',
        'toggleHighContrast',
        'hover',
        'coreCommands',
        'linesOperations',
        'wordOperations',
      ],
    })

    options.onCreate?.(ed)
    setEditorInstance(ed)

    // Selection change handler
    ed.onDidChangeCursorSelection(() => {
      if (options.onSelectionChange) {
        const selection = ed.getSelection()
        if (selection && !selection.isEmpty()) {
          const text = ed.getModel()?.getValueInRange(selection) || ''
          const lineContent =
            ed.getModel()?.getLineContent(selection.startLineNumber) || ''
          options.onSelectionChange({
            text,
            range: selection,
            line: lineContent,
          })
        } else {
          options.onSelectionChange(null)
        }
      }
    })

    // Scroll handler
    ed.onDidScrollChange(() => {
      if (options.onScroll) {
        const scrollTop = ed.getScrollTop()
        const visibleRanges = ed.getVisibleRanges()
        if (visibleRanges.length > 0) {
          options.onScroll(scrollTop, visibleRanges[0])
        }
      }
    })

    // Handle Ctrl+F directly in Monaco editor - update search store directly
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      // Get selected text if any
      const selection = ed.getSelection();
      const selectedText = selection && !selection.isEmpty()
        ? ed.getModel()?.getValueInRange(selection) || ''
        : '';

      // Update search query directly if setSearchQuery is provided
      if (selectedText && options.setSearchQuery) {
        options.setSearchQuery(selectedText);
      }

      // Optionally focus search input if function is provided
      if (options.focusSearchInput) {
        options.focusSearchInput();
      }

      return null; // Prevent default Monaco behavior
    })

    // Enter key - go to next search match
    ed.addCommand(monaco.KeyCode.Enter, () => {
      if (options.onSearchNext) {
        options.onSearchNext()
      }
      return null
    })

    // Shift+Enter - go to previous search match
    ed.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      if (options.onSearchPrev) {
        options.onSearchPrev()
      }
      return null
    })

    // Also disable other find-related shortcuts
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      // Disable Ctrl+H (replace)
      return null
    })

    // Override the editor's built-in find controller
    const findController = ed.getContribution('editor.contrib.findController')
    if (findController) {
      // Override the show method to prevent the find widget from appearing
      const originalShow = (findController as any).show
      if (originalShow) {
        ;(findController as any).show = function () {
          // Do nothing - prevent find widget from showing
          return
        }
      }

      // Override focus behavior to prevent find widget
      if ((findController as any).focusFindInput) {
        (findController as any).focusFindInput = function () {
          return
        }
      }

      // Disable any find widget state changes
      if ((findController as any).getState) {
        const originalGetState = (findController as any).getState
        if (originalGetState) {
          (findController as any).getState = function () {
            const state = originalGetState.call(this)
            if (state) {
              // Override isRevealed to always be false
              Object.defineProperty(state, 'isRevealed', {
                get: () => false,
                set: () => {},
                configurable: true
              })
            }
            return state
          }
        }
      }
    }
  })

  // Update content
  createEffect(
    on(options.content, (content) => {
      const ed = editorInstance()
      if (ed && content !== ed.getValue()) {
        console.log(content)
        ed.setValue(content)
      }
    }),
  )

  // Update settings
  createEffect(
    on(options.settings, (settings) => {
      editorInstance()?.updateOptions({
        fontSize: settings.fontSize,
        lineHeight: settings.rowHeight,
        wordWrap: settings.wrapLines ? 'on' : 'off',
      })
    }),
  )

  // Update search decorations
  createEffect(
    on(
      () => [options.searchMatches(), options.currentMatchIndex()] as const,
      ([matches, currentIndex]) => {
        const ed = editorInstance()
        const monaco = monacoInstance()
        if (!ed || !monaco) return

        const decorations: Array<monaco.editor.IModelDeltaDecoration> = []

        // Group matches by line
        const matchesByLine = new Map<number, Array<number>>()
        matches.forEach((m, idx) => {
          const line = m.lineIndex + 1 // Monaco is 1-indexed
          if (!matchesByLine.has(line)) {
            matchesByLine.set(line, [])
          }
          matchesByLine.get(line)!.push(idx)
        })

        matches.forEach((match, idx) => {
          const lineNumber = match.lineIndex + 1
          const isCurrentMatch = idx === currentIndex

          decorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: isCurrentMatch
                ? 'search-match-active-line'
                : 'search-match-line',
              overviewRuler: {
                color: isCurrentMatch ? '#f97316' : '#ca8a04',
                position: monaco.editor.OverviewRulerLane.Center,
              },
            },
          })
        })

        searchDecorations = ed.deltaDecorations(searchDecorations, decorations)
      },
    ),
  )

  // Update marker decorations
  createEffect(
    on(options.markerLines, (lines) => {
      const ed = editorInstance()
      const monaco = monacoInstance()
      if (!ed || !monaco) return

      const decorations: Array<monaco.editor.IModelDeltaDecoration> = lines.map(
        (line) => ({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'marker-line',
            overviewRuler: {
              color: '#3b82f6',
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        }),
      )

      markerDecorations = ed.deltaDecorations(markerDecorations, decorations)
    }),
  )

  // Update highlight rule decorations
  createEffect(
    on(
      () => [options.highlightRules(), options.content()] as const,
      ([rules, content]) => {
        const ed = editorInstance()
        const monaco = monacoInstance()
        if (!ed || !monaco || !content) return

        const decorations: Array<monaco.editor.IModelDeltaDecoration> = []
        const lines = content.split('\n')

        rules.forEach((rule) => {
          try {
            const pattern = rule.isRegex
              ? rule.pattern
              : rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const flags = rule.caseSensitive ? 'g' : 'gi'
            const regex = new RegExp(pattern, flags)

            lines.forEach((line, idx) => {
              if (regex.test(line)) {
                regex.lastIndex = 0
                decorations.push({
                  range: new monaco.Range(idx + 1, 1, idx + 1, 1),
                  options: {
                    isWholeLine: rule.applyToWholeLine,
                    className: `highlight-rule-${rule.id}`,
                    inlineClassName: rule.applyToWholeLine
                      ? undefined
                      : `highlight-inline-${rule.id}`,
                  },
                })
              }
            })
          } catch {
            // Invalid regex, skip
          }
        })

        highlightDecorations = ed.deltaDecorations(
          highlightDecorations,
          decorations,
        )
      },
    ),
  )

  onCleanup(() => {
    editorInstance()?.dispose()
  })

  // API
  const scrollToLine = (line: number, center = true) => {
    const ed = editorInstance()
    if (!ed) return

    if (center) {
      ed.revealLineInCenter(line)
    } else {
      ed.revealLine(line)
    }
  }

  const revealLine = (line: number) => {
    editorInstance()?.revealLine(line)
  }

  const getVisibleRange = () => {
    const ranges = editorInstance()?.getVisibleRanges()
    return ranges?.[0] ?? null
  }

  // Monaco native find functionality
  const findNext = (query: string, findOptions?: any) => {
    const editor = editorInstance()
    if (!editor) return false

    const controller = editor.getContribution('editor.contrib.findController')
    if (!controller) return false

    try {
      // Ensure the find widget stays hidden
      const findController = controller as any

      // Override any show methods to prevent UI from appearing
      if (findController.show) {
        findController.show = function () {
          return
        }
      }

      findController.start({
        forceRevealReplace: false,
        seedSearchStringFromSelection: 'single',
        seedSearchStringFromNonEmptySelection: true,
        shouldFocus: false,
        shouldAnimate: true,
        updateSearchScope: false,
        ...findOptions,
      })

      if (query) {
        findController.getState().change({ searchString: query }, true)
      }

      const result = findController.moveToNextMatch()

      // Hide any find widget that might have been shown
      if (findController.hide) {
        findController.hide()
      }

      return result
    } catch {
      return false
    }
  }

  const findPrevious = (query: string, findOptions?: any) => {
    const editor = editorInstance()
    if (!editor) return false

    const controller = editor.getContribution('editor.contrib.findController')
    if (!controller) return false

    try {
      // Ensure the find widget stays hidden
      const findController = controller as any

      // Override any show methods to prevent UI from appearing
      if (findController.show) {
        findController.show = function () {
          return
        }
      }

      findController.start({
        forceRevealReplace: false,
        seedSearchStringFromSelection: 'single',
        seedSearchStringFromNonEmptySelection: true,
        shouldFocus: false,
        shouldAnimate: true,
        updateSearchScope: false,
        ...findOptions,
      })

      if (query) {
        findController.getState().change({ searchString: query }, true)
      }

      const result = findController.moveToPrevMatch()

      // Hide any find widget that might have been shown
      if (findController.hide) {
        findController.hide()
      }

      return result
    } catch {
      return false
    }
  }

  const getFindState = () => {
    const editor = editorInstance()
    if (!editor) return null

    const controller = editor.getContribution('editor.contrib.findController')
    if (!controller) return null

    const findController = controller as any
    return findController.getState ? findController.getState() : null
  }

  return {
    editor: editorInstance,
    monaco: monacoInstance,
    scrollToLine,
    revealLine,
    getVisibleRange,
    findNext,
    findPrevious,
    getFindState,
  }
}
