import { createContext, useContext, createMemo, type ParentProps } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { SearchOptions, SearchMatch } from '~/types'
import { buildSearchRegex } from '~/utils/searchHelpers'

interface SearchState {
  options: SearchOptions
  matches: SearchMatch[]
  currentMatchIndex: number
}

interface SearchActions {
  setQuery: (query: string) => void
  setIsRegex: (isRegex: boolean) => void
  setCaseSensitive: (caseSensitive: boolean) => void
  setWholeWord: (wholeWord: boolean) => void
  updateMatches: (lines: string[]) => void
  nextMatch: () => void
  prevMatch: () => void
  goToMatch: (index: number) => void
  clearSearch: () => void
}

type SearchStore = [SearchState, SearchActions, { currentMatch: () => SearchMatch | null }]

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
    currentMatchIndex: -1,
  })

  // Derived: current match
  const currentMatch = createMemo(() => {
    if (state.currentMatchIndex >= 0 && state.currentMatchIndex < state.matches.length) {
      return state.matches[state.currentMatchIndex]
    }
    return null
  })

  const actions: SearchActions = {
    setQuery: (query: string) => {
      setState('options', 'query', query)
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

    updateMatches: (lines: string[]) => {
      const regex = buildSearchRegex(state.options)
      if (!regex) {
        setState({ matches: [], currentMatchIndex: -1 })
        return
      }

      const matches: SearchMatch[] = []
      for (let i = 0; i < lines.length; i++) {
        regex.lastIndex = 0
        let matchIndex = 0
        let match
        while ((match = regex.exec(lines[i])) !== null) {
          matches.push({ lineIndex: i, matchIndex })
          matchIndex++
          if (match[0].length === 0) regex.lastIndex++
        }
      }

      setState({
        matches,
        currentMatchIndex: matches.length > 0 ? 0 : -1,
      })
    },

    nextMatch: () => {
      if (state.matches.length === 0) return
      setState('currentMatchIndex', (prev) =>
        prev < state.matches.length - 1 ? prev + 1 : 0,
      )
    },

    prevMatch: () => {
      if (state.matches.length === 0) return
      setState('currentMatchIndex', (prev) =>
        prev > 0 ? prev - 1 : state.matches.length - 1,
      )
    },

    goToMatch: (index: number) => {
      if (index >= 0 && index < state.matches.length) {
        setState('currentMatchIndex', index)
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
        currentMatchIndex: -1,
      })
    },
  }

  return (
    <SearchContext.Provider value={[state, actions, { currentMatch }]}>
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
