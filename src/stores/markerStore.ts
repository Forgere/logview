import { createContext, useContext, createMemo, type ParentProps } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { LogMarker } from '~/types'

interface MarkerState {
  markers: LogMarker[]
  selectedIds: Set<string>
}

interface MarkerActions {
  addMarker: (marker: LogMarker) => void
  removeMarker: (id: string) => void
  removeMarkers: (ids: string[]) => void
  updateMarker: (id: string, updates: Partial<LogMarker>) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  clearMarkers: () => void
}

type MarkerStore = [
  MarkerState,
  MarkerActions,
  {
    sortedMarkers: () => LogMarker[]
    selectedMarkers: () => LogMarker[]
  },
]

const MarkerContext = createContext<MarkerStore>()

export function MarkerProvider(props: ParentProps) {
  const [state, setState] = createStore<MarkerState>({
    markers: [],
    selectedIds: new Set(),
  })

  // Derived: sorted markers by line number
  const sortedMarkers = createMemo(() =>
    [...state.markers].sort(
      (a, b) => a.range.startLineNumber - b.range.startLineNumber,
    ),
  )

  // Derived: selected markers
  const selectedMarkers = createMemo(() =>
    state.markers.filter((m) => state.selectedIds.has(m.id)),
  )

  const actions: MarkerActions = {
    addMarker: (marker: LogMarker) => {
      setState('markers', (prev) => [...prev, marker])
    },

    removeMarker: (id: string) => {
      setState(
        produce((s) => {
          s.markers = s.markers.filter((m) => m.id !== id)
          s.selectedIds.delete(id)
        }),
      )
    },

    removeMarkers: (ids: string[]) => {
      const idsSet = new Set(ids)
      setState(
        produce((s) => {
          s.markers = s.markers.filter((m) => !idsSet.has(m.id))
          ids.forEach((id) => s.selectedIds.delete(id))
        }),
      )
    },

    updateMarker: (id: string, updates: Partial<LogMarker>) => {
      setState('markers', (markers) =>
        markers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      )
    },

    toggleSelect: (id: string) => {
      setState(
        produce((s) => {
          if (s.selectedIds.has(id)) {
            s.selectedIds.delete(id)
          } else {
            s.selectedIds.add(id)
          }
        }),
      )
    },

    selectAll: () => {
      setState(
        produce((s) => {
          s.markers.forEach((m) => s.selectedIds.add(m.id))
        }),
      )
    },

    deselectAll: () => {
      setState('selectedIds', new Set())
    },

    clearMarkers: () => {
      setState({
        markers: [],
        selectedIds: new Set(),
      })
    },
  }

  return (
    <MarkerContext.Provider value={[state, actions, { sortedMarkers, selectedMarkers }]}>
      {props.children}
    </MarkerContext.Provider>
  )
}

export function useMarkers() {
  const context = useContext(MarkerContext)
  if (!context) {
    throw new Error('useMarkers must be used within a MarkerProvider')
  }
  return context
}
