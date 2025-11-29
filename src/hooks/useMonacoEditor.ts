import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  on,
  type Accessor,
} from 'solid-js'
import loader from '@monaco-editor/loader'
import type { editor, Monaco } from 'monaco-editor'
import type { ViewSettings, HighlightRule, SearchMatch } from '~/types'

export interface UseMonacoEditorOptions {
  content: Accessor<string>
  settings: Accessor<ViewSettings>
  highlightRules: Accessor<HighlightRule[]>
  searchMatches: Accessor<SearchMatch[]>
  currentMatchIndex: Accessor<number>
  markerLines: Accessor<number[]>
  onSelectionChange?: (selection: {
    text: string
    range: editor.IRange
    line: string
  } | null) => void
  onScroll?: (scrollTop: number, visibleRange: editor.IRange) => void
}

export interface MonacoEditorAPI {
  editor: Accessor<editor.IStandaloneCodeEditor | null>
  monaco: Accessor<Monaco | null>
  scrollToLine: (line: number, center?: boolean) => void
  revealLine: (line: number) => void
  getVisibleRange: () => editor.IRange | null
}

export function useMonacoEditor(
  container: Accessor<HTMLDivElement | undefined>,
  options: UseMonacoEditorOptions,
): MonacoEditorAPI {
  const [editorInstance, setEditorInstance] =
    createSignal<editor.IStandaloneCodeEditor | null>(null)
  const [monacoInstance, setMonacoInstance] = createSignal<Monaco | null>(null)

  // Decoration collections for search highlights, markers, etc.
  let searchDecorations: string[] = []
  let markerDecorations: string[] = []
  let highlightDecorations: string[] = []

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
    })

    setEditorInstance(ed)

    // Selection change handler
    ed.onDidChangeCursorSelection((e) => {
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
  })

  // Update content
  createEffect(
    on(options.content, (content) => {
      const ed = editorInstance()
      if (ed && content !== ed.getValue()) {
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

        const decorations: editor.IModelDeltaDecoration[] = []

        // Group matches by line
        const matchesByLine = new Map<number, number[]>()
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

      const decorations: editor.IModelDeltaDecoration[] = lines.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'marker-line',
          overviewRuler: {
            color: '#3b82f6',
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      }))

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

        const decorations: editor.IModelDeltaDecoration[] = []
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

  return {
    editor: editorInstance,
    monaco: monacoInstance,
    scrollToLine,
    revealLine,
    getVisibleRange,
  }
}
