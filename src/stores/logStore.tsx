import { createContext, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ParentProps } from 'solid-js'
import type { FileInfo, ViewMode, ViewSettings, WatchMode } from '~/types'
import { FileStreamer } from '~/services/fileStreamService'
import type * as monaco from 'monaco-editor'
import { Range } from 'monaco-editor'

interface LogState {
  file: FileInfo | null
  isStreaming: boolean
  progress: number
  viewMode: ViewMode
  watchPattern: string
  watchMode: WatchMode
  watchMatchIndex: number | null
  pendingWatchMatches: Array<number>
  lastScrollRequest: number
  lineCount: number
}

interface LogActions {
  loadFile: (file: File, newLineConfig: ViewSettings['newLineConfig']) => void
  reset: () => void
  setViewMode: (mode: ViewMode) => void
  setWatchPattern: (pattern: string) => void
  setWatchMode: (mode: WatchMode) => void
  setWatchMatchIndex: (index: number | null) => void
  clearPendingWatchMatches: () => void
  togglePause: () => void
  resumeFollowing: () => void
}

interface LogStoreContext {
  state: LogState
  actions: LogActions
  monacoEditor: monaco.editor.IStandaloneCodeEditor | null
  setMonacoEditor: (editor: monaco.editor.IStandaloneCodeEditor | null) => void
}

const LogContext = createContext<LogStoreContext | null>(null)

export function LogProvider(props: ParentProps) {
  let streamer: FileStreamer | null = null
  let pendingBuffer: string[] = []
  let monacoInstance: monaco.editor.IStandaloneCodeEditor | null = null
  let newLineConfig: ViewSettings['newLineConfig'] | null = null

  const [state, setState] = createStore<LogState>({
    file: null,
    isStreaming: false,
    progress: 0,
    viewMode: 'follow',
    watchPattern: '',
    watchMode: 'PAUSE_ALL',
    watchMatchIndex: null,
    pendingWatchMatches: [],
    lastScrollRequest: 0,
    lineCount: 0,
  })

  // Process chunk according to newLineConfig
  const processChunk = (chunk: string[]): string[] => {
    if (!newLineConfig || !newLineConfig.enabled || !newLineConfig.match)
      return chunk

    const result: string[] = []
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
    const startLine = model.getLineCount() + 1

    const doFlush = () => {
      model.pushEditOperations([], [
        {
          range: new Range(startLine, 1, startLine, 1),
          text: chunk.join('\n') + '\n',
        },
      ], () => null)

      setState('lineCount', model.getLineCount())

      // Watch pattern
      if (state.watchPattern) {
        const lowerPattern = state.watchPattern.toLowerCase()
        const matches = chunk
          .map((line, i) => line.toLowerCase().includes(lowerPattern) ? startLine + i : null)
          .filter((v): v is number => v !== null)

        if (matches.length) {
          if (state.watchMode === 'MARK_ONLY') {
            setState('pendingWatchMatches', prev => [...prev, ...matches])
          } else if (state.watchMatchIndex === null) {
            setState('watchMatchIndex', matches[0])
            setState('viewMode', 'browse')
          }
        }
      }

      if (state.viewMode === 'follow') {
        setState('lastScrollRequest', Date.now())
      }
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(doFlush)
    } else {
      requestAnimationFrame(doFlush)
    }
  }

  const actions: LogActions = {
    loadFile: (file, config) => {
      actions.reset()
      newLineConfig = config

      setState({
        file: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          extension: '.' + file.name.split('.').pop(),
        },
        isStreaming: true,
        viewMode: 'follow',
        watchMatchIndex: null,
        pendingWatchMatches: [],
        progress: 0,
        lineCount: 0,
      })

      streamer = new FileStreamer()

      streamer.streamFile(file, {
        onChunk: (lines) => {
          pendingBuffer.push(...processChunk(lines))
          if (pendingBuffer.length > 500) flushBuffer()
        },
        onProgress: (bytesRead, total) => setState('progress', (bytesRead / total) * 100),
        onComplete: () => {
          flushBuffer()
          setState('isStreaming', false)
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

      setState({
        file: null,
        isStreaming: false,
        progress: 0,
        viewMode: 'follow',
        watchPattern: '',
        watchMode: 'PAUSE_ALL',
        watchMatchIndex: null,
        pendingWatchMatches: [],
        lastScrollRequest: 0,
        lineCount: 0,
      })

      if (monacoInstance) {
        const model = monacoInstance.getModel()
        if (model) model.setValue('')
      }
    },

    setViewMode: (mode) => setState('viewMode', mode),
    setWatchPattern: (pattern) => setState({ watchPattern: pattern, watchMatchIndex: null }),
    setWatchMode: (mode) => setState('watchMode', mode),
    setWatchMatchIndex: (index) => setState('watchMatchIndex', index),
    clearPendingWatchMatches: () => setState('pendingWatchMatches', []),
    togglePause: () => {
      if (!streamer) return
      if (state.isStreaming) {
        streamer.pause()
        setState('isStreaming', false)
      } else {
        streamer.resume()
        setState('isStreaming', true)
      }
    },
    resumeFollowing: () => setState({ viewMode: 'follow', watchMatchIndex: null }),
  }

  return (
    <LogContext.Provider value={{
      state,
      actions,
      monacoEditor: monacoInstance,
      setMonacoEditor: (editor: monaco.editor.IStandaloneCodeEditor | null) => {
        monacoInstance = editor
      }
    }}>
      {props.children}
    </LogContext.Provider>
  )
}

export function useLog(): LogStoreContext {
  const context = useContext(LogContext)
  if (!context) throw new Error('useLog must be used within LogProvider')
  return context
}
