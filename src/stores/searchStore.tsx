import { createContext, createMemo, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ParentProps } from 'solid-js'
import type { SearchMatch, SearchOptions } from '~/types'
import { buildSearchRegex } from '~/utils/searchHelpers'

// Monaco integration interface
interface MonacoSearchIntegration {
  findNext: (query: string, options?: any) => boolean
  findPrevious: (query: string, options?: any) => boolean
  scrollToLine: (line: number, center?: boolean) => void
  scrollToPosition: (line: number, column: number, center?: boolean) => void
  setSelection: (startLine: number, startCol: number, endLine: number, endCol: number) => void
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
        if (match) {
          const line = match.lineIndex + 1
          const startCol = (match.startColumn ?? 0) + 1
          const endCol = (match.endColumn ?? match.startColumn ?? 0) + 1
          state.monacoIntegration.scrollToPosition(line, startCol, true)
          state.monacoIntegration.setSelection(line, startCol, line, endCol)
        }
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
        if (match) {
          const line = match.lineIndex + 1
          const startCol = (match.startColumn ?? 0) + 1
          const endCol = (match.endColumn ?? match.startColumn ?? 0) + 1
          state.monacoIntegration.scrollToPosition(line, startCol, true)
          state.monacoIntegration.setSelection(line, startCol, line, endCol)
        }
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
