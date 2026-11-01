import {
  createContext,
  createEffect,
  createMemo,
  onMount,
  useContext,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ParentProps } from 'solid-js'
import type { SearchMatch, SearchOptions } from '~/types'
import { UI_KEYS, readStored, writeStored } from '~/lib/persist'
import { buildSearchRegex } from '~/utils/searchHelpers'

// Monaco integration interface
interface MonacoSearchIntegration {
  findNext: (query: string, options?: any) => boolean
  findPrevious: (query: string, options?: any) => boolean
  scrollToLine: (line: number, center?: boolean) => void
  scrollToPosition: (line: number, column: number, center?: boolean) => void
  setSelection: (
    startLine: number,
    startCol: number,
    endLine: number,
    endCol: number,
  ) => void
}

interface SearchState {
  options: SearchOptions
  matches: Array<SearchMatch>
  currentMatchIndex: number
  monacoIntegration?: MonacoSearchIntegration
}

interface SearchActions {
  setQuery: (query: string) => void
  setIsRegex: (isRegex: boolean) => void
  setCaseSensitive: (caseSensitive: boolean) => void
  setWholeWord: (wholeWord: boolean) => void
  setMonacoIntegration: (integration: MonacoSearchIntegration) => void
  updateMatches: (lines?: Array<SearchMatch>) => void
  nextMatch: () => void
  prevMatch: () => void
  goToMatch: (index: number) => void
  clearSearch: () => void
}

type SearchStore = [
  SearchState,
  SearchActions,
  {
    currentMatch: () => SearchMatch | null
    hasResults: () => boolean
    resultsCount: () => number
    searchQuery: () => string
    isValidSearch: () => boolean
  },
]

const SearchContext = createContext<SearchStore>()

export function SearchProvider(props: ParentProps) {
  const [state, setState] = createStore<SearchState>({
    options: {
      query: '',
      isRegex: false,
      caseSensitive: false,
      wholeWord: false,
    },
    matches: [],
    currentMatchIndex: 0,
  })
  // Only the three search *flags* survive a refresh. The query string, the
  // match list, the current index and the Monaco integration are session
  // state: they all point at content inside an editor that is rebuilt on
  // every page load, so restoring them would be meaningless.
  //
  // `restored` gates the write effect: `onMount` runs AFTER the effect's first
  // pass, so without the gate the effect would rewrite the stored defaults
  // (`false`) before the real values are read. The gate keeps the first pass a
  // no-op. Dependencies are still tracked (the `state.options.*` reads happen
  // before the gate), so the effect re-runs whenever a flag changes later.
  let restored = false
  onMount(() => {
    setState('options', {
      isRegex: readStored(UI_KEYS.searchRegex, false),
      caseSensitive: readStored(UI_KEYS.searchCase, false),
      wholeWord: readStored(UI_KEYS.searchWholeWord, false),
    })
    restored = true
  })

  createEffect(() => {
    if (!restored) return
    writeStored(UI_KEYS.searchRegex, state.options.isRegex)
    writeStored(UI_KEYS.searchCase, state.options.caseSensitive)
    writeStored(UI_KEYS.searchWholeWord, state.options.wholeWord)
  })

  // Derived: current match
  const currentMatch = createMemo(() => {
    if (
      state.currentMatchIndex >= 0 &&
      state.currentMatchIndex < state.matches.length
    ) {
      return state.matches[state.currentMatchIndex]
    }
    return null
  })

  // Derived: has search results
  const hasResults = createMemo(() => state.matches.length > 0)

  // Derived: results count
  const resultsCount = createMemo(() => state.matches.length)

  // Derived: current search query
  const searchQuery = createMemo(() => state.options.query)

  // Derived: is valid search (has query and regex is valid)
  const isValidSearch = createMemo(() => {
    const query = state.options.query.trim()
    if (!query) return false

    try {
      // Test if regex is valid
      buildSearchRegex(state.options)
      return true
    } catch {
      return false
    }
  })

  const actions: SearchActions = {
    setQuery: (query: string) => {
      setState('options', 'query', query)
      // Reset to first match when query changes
      if (!query) {
        setState('currentMatchIndex', 0)
        setState('matches', [])
      }
    },

    setIsRegex: (isRegex: boolean) => {
      setState('options', 'isRegex', isRegex)
    },

    setCaseSensitive: (caseSensitive: boolean) => {
      setState('options', 'caseSensitive', caseSensitive)
    },

    setWholeWord: (wholeWord: boolean) => {
      setState('options', 'wholeWord', wholeWord)
    },

    setMonacoIntegration: (integration: MonacoSearchIntegration) => {
      setState('monacoIntegration', integration)
    },

    updateMatches: (lines?: Array<SearchMatch>) => {
      setState('matches', lines || [])
      // Reset index if matches changed and current index is out of bounds
      if (lines && state.currentMatchIndex >= lines.length) {
        setState('currentMatchIndex', lines.length > 0 ? 0 : 0)
      }
    },

    nextMatch: () => {
      if (state.matches.length === 0) return

      const nextIndex =
        state.currentMatchIndex < state.matches.length - 1
          ? state.currentMatchIndex + 1
          : 0

      setState('currentMatchIndex', nextIndex)

      // Scroll to match and select it using Monaco integration
      if (state.monacoIntegration) {
        const match = state.matches[nextIndex]
        const line = match.lineIndex + 1
        const startCol = (match.startColumn ?? 0) + 1
        const endCol = (match.endColumn ?? match.startColumn ?? 0) + 1
        state.monacoIntegration.scrollToPosition(line, startCol, true)
        state.monacoIntegration.setSelection(line, startCol, line, endCol)
      }
    },

    prevMatch: () => {
      if (state.matches.length === 0) return

      const prevIndex =
        state.currentMatchIndex > 0
          ? state.currentMatchIndex - 1
          : state.matches.length - 1

      setState('currentMatchIndex', prevIndex)

      // Scroll to match and select it using Monaco integration
      if (state.monacoIntegration) {
        const match = state.matches[prevIndex]
        const line = match.lineIndex + 1
        const startCol = (match.startColumn ?? 0) + 1
        const endCol = (match.endColumn ?? match.startColumn ?? 0) + 1
        state.monacoIntegration.scrollToPosition(line, startCol, true)
        state.monacoIntegration.setSelection(line, startCol, line, endCol)
      }
    },

    goToMatch: (index: number) => {
      if (index >= 0 && index < state.matches.length) {
        setState('currentMatchIndex', index)
      } else if (state.matches.length === 0) {
        setState('currentMatchIndex', 0)
      }
    },

    clearSearch: () => {
      setState({
        options: {
          query: '',
          isRegex: false,
          caseSensitive: false,
          wholeWord: false,
        },
        matches: [],
        currentMatchIndex: 0,
      })
    },
  }

  return (
    <SearchContext.Provider
      value={[
        state,
        actions,
        {
          currentMatch,
          hasResults,
          resultsCount,
          searchQuery,
          isValidSearch,
        },
      ]}
    >
      {props.children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
