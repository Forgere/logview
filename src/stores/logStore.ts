import { createContext, useContext, type ParentProps } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { ViewMode, WatchMode, ViewSettings, FileInfo } from '~/types'
import { FileStreamer } from '~/services/fileStreamService'

interface LogState {
  // File info
  file: FileInfo | null
  // Lines
  lines: string[]
  rawLines: string[] // For re-processing on config change
  // Stream state
  isStreaming: boolean
  progress: number
  // View mode
  viewMode: ViewMode
  // Watch mode
  watchPattern: string
  watchMode: WatchMode
  watchMatchIndex: number | null
  pendingWatchMatches: number[]
  // Scroll control
  lastScrollRequest: number
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
  reprocessLines: (newLineConfig: ViewSettings['newLineConfig']) => void
}

type LogStore = [LogState, LogActions]

const LogContext = createContext<LogStore>()

// Helper to process raw lines based on config
const processChunk = (
  chunk: string[],
  config: ViewSettings['newLineConfig'],
): string[] => {
  if (!config || !config.enabled || !config.match) return chunk

  const result: string[] = []
  const { match, position } = config

  for (let i = 0; i < chunk.length; i++) {
    const line = chunk[i]
    if (line.indexOf(match) === -1) {
      result.push(line)
      continue
    }

    const parts = line.split(match)
    if (parts.length === 1) {
      result.push(parts[0])
      continue
    }

    if (position === 'after') {
      const len = parts.length
      for (let j = 0; j < len - 1; j++) {
        result.push(parts[j] + match)
      }
      result.push(parts[len - 1])
    } else {
      const len = parts.length
      result.push(parts[0])
      for (let j = 1; j < len; j++) {
        result.push(match + parts[j])
      }
    }
  }
  return result
}

export function LogProvider(props: ParentProps) {
  let streamer: FileStreamer | null = null
  let uiUpdateTimer: number | null = null
  let pendingBuffer: string[] = []

  const [state, setState] = createStore<LogState>({
    file: null,
    lines: [],
    rawLines: [],
    isStreaming: false,
    progress: 0,
    viewMode: 'follow',
    watchPattern: '',
    watchMode: 'PAUSE_ALL',
    watchMatchIndex: null,
    pendingWatchMatches: [],
    lastScrollRequest: 0,
  })

  const flushBuffer = () => {
    if (pendingBuffer.length === 0) return

    const chunkToAppend = [...pendingBuffer]
    pendingBuffer = []

    setState(
      produce((s) => {
        const currentLength = s.lines.length
        const { watchPattern, watchMode } = s

        // Check matches on new lines
        if (watchPattern) {
          const lowerPattern = watchPattern.toLowerCase()
          const newMatches: number[] = []

          for (let i = 0; i < chunkToAppend.length; i++) {
            if (chunkToAppend[i].toLowerCase().indexOf(lowerPattern) !== -1) {
              newMatches.push(currentLength + i)
            }
          }

          if (newMatches.length > 0) {
            if (watchMode === 'MARK_ONLY') {
              s.pendingWatchMatches.push(...newMatches)
            } else {
              if (s.watchMatchIndex === null) {
                s.watchMatchIndex = newMatches[0]
                if (watchMode === 'PAUSE_ALL') {
                  s.viewMode = 'browse'
                }
              }
            }
          }
        }

        s.lines.push(...chunkToAppend)

        if (s.viewMode === 'follow') {
          s.lastScrollRequest = Date.now()
        }
      }),
    )
  }

  const actions: LogActions = {
    loadFile: (file: File, newLineConfig: ViewSettings['newLineConfig']) => {
      actions.reset()

      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      setState({
        file: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          extension: ext ? `.${ext}` : 'default',
        },
        isStreaming: true,
        viewMode: 'follow',
        watchMatchIndex: null,
        pendingWatchMatches: [],
      })

      streamer = new FileStreamer()
      uiUpdateTimer = window.setInterval(flushBuffer, 200)

      streamer.streamFile(file, {
        onChunk: (chunkLines) => {
          // Store raw lines
          setState(
            produce((s) => {
              s.rawLines.push(...chunkLines)
            }),
          )

          // Process and queue
          const processed = processChunk(chunkLines, newLineConfig)
          pendingBuffer.push(...processed)
        },
        onProgress: (bytesRead, totalBytes) => {
          setState('progress', (bytesRead / totalBytes) * 100)
        },
        onComplete: () => {
          flushBuffer()
          setState('isStreaming', false)
          if (uiUpdateTimer) {
            clearInterval(uiUpdateTimer)
            uiUpdateTimer = null
          }
          if (state.viewMode === 'follow') {
            setState('lastScrollRequest', Date.now())
          }
        },
        onError: (err) => {
          console.error('Stream error', err)
          setState('isStreaming', false)
          alert('Error reading file: ' + err.message)
        },
      })
    },

    reset: () => {
      if (streamer) {
        streamer.cancel()
        streamer = null
      }
      if (uiUpdateTimer) {
        clearInterval(uiUpdateTimer)
        uiUpdateTimer = null
      }
      pendingBuffer = []

      setState({
        file: null,
        lines: [],
        rawLines: [],
        isStreaming: false,
        progress: 0,
        viewMode: 'follow',
        watchMatchIndex: null,
        pendingWatchMatches: [],
        lastScrollRequest: 0,
      })
    },

    setViewMode: (mode: ViewMode) => {
      setState('viewMode', mode)
    },

    setWatchPattern: (pattern: string) => {
      setState({
        watchPattern: pattern,
        watchMatchIndex: null,
      })
    },

    setWatchMode: (mode: WatchMode) => {
      setState('watchMode', mode)
    },

    setWatchMatchIndex: (index: number | null) => {
      setState('watchMatchIndex', index)
    },

    clearPendingWatchMatches: () => {
      setState('pendingWatchMatches', [])
    },

    togglePause: () => {
      if (state.isStreaming) {
        streamer?.pause()
        setState('isStreaming', false)
      } else if (state.progress < 100 && state.file) {
        streamer?.resume()
        setState('isStreaming', true)
        if (!uiUpdateTimer) {
          uiUpdateTimer = window.setInterval(flushBuffer, 200)
        }
        setState('watchMatchIndex', null)
      }
    },

    resumeFollowing: () => {
      setState({
        viewMode: 'follow',
        watchMatchIndex: null,
      })
    },

    reprocessLines: (newLineConfig: ViewSettings['newLineConfig']) => {
      if (state.rawLines.length > 0) {
        const processed = processChunk(state.rawLines, newLineConfig)
        setState({
          lines: processed,
          watchMatchIndex: null,
          pendingWatchMatches: [],
        })
      }
    },
  }

  return (
    <LogContext.Provider value={[state, actions]}>
      {props.children}
    </LogContext.Provider>
  )
}

export function useLog() {
  const context = useContext(LogContext)
  if (!context) {
    throw new Error('useLog must be used within a LogProvider')
  }
  return context
}
