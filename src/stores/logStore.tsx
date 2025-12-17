import { createContext, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ParentProps } from 'solid-js'
import type { FileInfo, ViewMode, ViewSettings, WatchMode } from '~/types'
import type * as monaco from 'monaco-editor'
import { FileStreamer } from '~/services/fileStreamService'

interface WatchState {
  pattern: string
  mode: WatchMode
  isActive: boolean
  matchedLines: Array<number>
}

interface LogState {
  file: FileInfo | null
  isStreaming: boolean
  progress: number
  viewMode: ViewMode
  lastScrollRequest: number
  lineCount: number
  watch: WatchState
}

interface LogActions {
  loadFile: (file: File, newLineConfig: ViewSettings['newLineConfig']) => void
  reset: () => void
  setViewMode: (mode: ViewMode) => void
  setWatchPattern: (pattern: string) => void
  setWatchMode: (mode: WatchMode) => void
  startWatch: () => void
  stopWatch: () => void
  clearWatchMatches: () => void
  togglePause: () => void
}

// Callback for watch matches - to be set by viewer
type WatchMatchCallback = (lineNumber: number, line: string) => void

interface LogStoreContext {
  state: LogState
  actions: LogActions
  monacoEditor: monaco.editor.IStandaloneCodeEditor | null
  setMonacoEditor: (editor: monaco.editor.IStandaloneCodeEditor | null) => void
  setWatchMatchCallback: (cb: WatchMatchCallback | null) => void
}

const LogContext = createContext<LogStoreContext | null>(null)

export function LogProvider(props: ParentProps) {
  let streamer: FileStreamer | null = null
  let pendingBuffer: Array<string> = []
  let monacoInstance: monaco.editor.IStandaloneCodeEditor | null = null
  let newLineConfig: ViewSettings['newLineConfig'] | null = null
  let watchMatchCallback: WatchMatchCallback | null = null
  let currentLineNumber = 0

  const [state, setState] = createStore<LogState>({
    file: null,
    isStreaming: false,
    progress: 0,
    viewMode: 'follow',
    lastScrollRequest: 0,
    lineCount: 0,
    watch: {
      pattern: '',
      mode: 'PAUSE_ALL',
      isActive: false,
      matchedLines: [],
    },
  })

  // Check line for watch pattern match
  const checkWatchMatch = (line: string, lineNumber: number) => {
    if (!state.watch.isActive || !state.watch.pattern) return

    try {
      const regex = new RegExp(state.watch.pattern, 'i')
      if (regex.test(line)) {
        // Add to matched lines
        setState('watch', 'matchedLines', (prev) => [...prev, lineNumber])

        if (state.watch.mode === 'PAUSE_ALL') {
          // Pause streaming and switch to browse mode
          if (streamer) {
            streamer.pause()
            setState('isStreaming', false)
          }
          setState('viewMode', 'browse')

          // Scroll to matched line
          if (monacoInstance) {
            monacoInstance.revealLineInCenter(lineNumber)
          }
        }

        // Notify callback for MARK_ONLY mode or additional handling
        if (watchMatchCallback) {
          watchMatchCallback(lineNumber, line)
        }
      }
    } catch {
      // Invalid regex, ignore
    }
  }

  // Process chunk according to newLineConfig
  const processChunk = (chunk: Array<string>): Array<string> => {
    if (!newLineConfig || !newLineConfig.enabled || !newLineConfig.match)
      return chunk

    const result: Array<string> = []
    const { match, position } = newLineConfig

    for (const line of chunk) {
      if (!line.includes(match)) {
        result.push(line)
        continue
      }

      const parts = line.split(match)
      if (parts.length === 1) {
        result.push(parts[0])
        continue
      }

      if (position === 'after') {
        for (let i = 0; i < parts.length - 1; i++) {
          result.push(parts[i] + match)
        }
        result.push(parts[parts.length - 1])
      } else {
        result.push(parts[0])
        for (let i = 1; i < parts.length; i++) {
          result.push(match + parts[i])
        }
      }
    }
    return result
  }

  const flushBuffer = () => {
    if (!monacoInstance || pendingBuffer.length === 0) return

    const chunk = [...pendingBuffer]
    pendingBuffer = []

    const model = monacoInstance.getModel()
    if (!model) return

    const scrollTop = monacoInstance.getScrollTop()
    const layoutInfo = monacoInstance.getLayoutInfo()
    const atBottom =
      scrollTop + layoutInfo.height >= monacoInstance.getScrollHeight() - 5
    const startLine = model.getLineCount() + 1

    // Check each line for watch matches before adding
    chunk.forEach((line, idx) => {
      const lineNum = startLine + idx
      checkWatchMatch(line, lineNum)
    })

    const BATCH_SIZE = 1000
    let index = 0

    const processBatch = () => {
      const batch = chunk.slice(index, index + BATCH_SIZE)
      if (batch.length === 0) return

      model.pushEditOperations(
        [],
        [
          {
            range: {
              startLineNumber: startLine + index,
              startColumn: 1,
              endLineNumber: startLine + index,
              endColumn: 1,
            },
            text: batch.join('\n') + '\n',
          },
        ],
        () => null,
      )

      index += BATCH_SIZE

      if (index < chunk.length) {
        if ('requestIdleCallback' in window) {
          ;(window as any).requestIdleCallback(processBatch)
        } else {
          requestAnimationFrame(processBatch)
        }
      } else {
        // Batch complete, update line count
        setState('lineCount', model.getLineCount())
        currentLineNumber = model.getLineCount()

        // Scroll logic
        if (state.viewMode === 'follow' || atBottom) {
          monacoInstance?.setScrollTop(monacoInstance.getScrollHeight())
        } else {
          monacoInstance?.setScrollTop(scrollTop)
        }
      }
    }

    processBatch()
  }

  const actions: LogActions = {
    loadFile: (file, config) => {
      actions.reset()
      newLineConfig = config
      currentLineNumber = 0

      setState({
        file: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          extension: '.' + file.name.split('.').pop(),
        },
        isStreaming: true,
        viewMode: 'follow',
        progress: 0,
        lineCount: 0,
        lastScrollRequest: 0,
      })

      streamer = new FileStreamer()

      streamer.streamFile(file, {
        onChunk: (lines) => {
          pendingBuffer.push(...processChunk(lines))
          if (pendingBuffer.length > 500) flushBuffer()
        },
        onProgress: (bytesRead, total) =>
          setState('progress', (bytesRead / total) * 100),
        onComplete: () => {
          flushBuffer()
          setState('isStreaming', false)
          setState('viewMode', 'browse')
        },
        onError: (err) => {
          console.error(err)
          setState('isStreaming', false)
        },
      })
    },

    reset: () => {
      if (streamer) streamer.cancel()
      streamer = null
      pendingBuffer = []
      newLineConfig = null
      currentLineNumber = 0

      setState({
        file: null,
        isStreaming: false,
        progress: 0,
        viewMode: 'follow',
        lastScrollRequest: 0,
        lineCount: 0,
        watch: {
          pattern: '',
          mode: 'PAUSE_ALL',
          isActive: false,
          matchedLines: [],
        },
      })

      if (monacoInstance) {
        const model = monacoInstance.getModel()
        if (model) model.setValue('')
      }
    },

    setViewMode: (mode: ViewMode) => {
      setState('viewMode', mode)
      if (mode === 'follow' && monacoInstance) {
        monacoInstance.setScrollTop(monacoInstance.getScrollHeight())
      }
    },

    setWatchPattern: (pattern: string) => {
      setState('watch', 'pattern', pattern)
    },

    setWatchMode: (mode: WatchMode) => {
      setState('watch', 'mode', mode)
    },

    startWatch: () => {
      if (state.watch.pattern) {
        setState('watch', 'isActive', true)
        setState('watch', 'matchedLines', [])

        // Scan existing content for matches
        if (monacoInstance) {
          const model = monacoInstance.getModel()
          if (model) {
            const content = model.getValue()
            const lines = content.split('\n')
            try {
              const regex = new RegExp(state.watch.pattern, 'i')
              lines.forEach((line, idx) => {
                const lineNumber = idx + 1
                if (regex.test(line)) {
                  setState('watch', 'matchedLines', (prev) => [
                    ...prev,
                    lineNumber,
                  ])
                  if (watchMatchCallback) {
                    watchMatchCallback(lineNumber, line)
                  }
                }
              })
            } catch {
              // Invalid regex
            }
          }
        }
      }
    },

    stopWatch: () => {
      setState('watch', 'isActive', false)
    },

    clearWatchMatches: () => {
      setState('watch', 'matchedLines', [])
    },

    togglePause: () => {
      if (!streamer) return
      if (state.isStreaming) {
        streamer.pause()
        setState('isStreaming', false)
        setState('viewMode', 'browse')
      } else {
        streamer.resume()
        setState('isStreaming', true)
        setState('viewMode', 'follow')
      }
    },
  }

  return (
    <LogContext.Provider
      value={{
        state,
        actions,
        monacoEditor: monacoInstance,
        setMonacoEditor: (
          editor: monaco.editor.IStandaloneCodeEditor | null,
        ) => {
          monacoInstance = editor
        },
        setWatchMatchCallback: (cb: WatchMatchCallback | null) => {
          watchMatchCallback = cb
        },
      }}
    >
      {props.children}
    </LogContext.Provider>
  )
}

export function useLog(): LogStoreContext {
  const context = useContext(LogContext)
  if (!context) throw new Error('useLog must be used within LogProvider')
  return context
}
