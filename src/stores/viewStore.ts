import { createContext, useContext, createEffect, type ParentProps } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ViewSettings, HighlightRule } from '~/types'
import { DEFAULT_VIEW_SETTINGS, DEFAULT_HIGHLIGHT_RULES } from '~/types'
import {
  loadConfigForExtension,
  saveConfigForExtension,
  getExtension,
} from '~/services/configService'

interface ViewState {
  settings: ViewSettings
  highlightRules: HighlightRule[]
  currentExtension: string
}

interface ViewActions {
  updateSettings: (partial: Partial<ViewSettings>) => void
  setNewLineConfig: (config: ViewSettings['newLineConfig']) => void
  addHighlightRule: (rule: HighlightRule) => void
  updateHighlightRule: (id: string, updates: Partial<HighlightRule>) => void
  removeHighlightRule: (id: string) => void
  loadForFile: (fileName: string) => void
  saveConfig: () => void
}

type ViewStore = [ViewState, ViewActions]

const ViewContext = createContext<ViewStore>()

export function ViewProvider(props: ParentProps) {
  const [state, setState] = createStore<ViewState>({
    settings: { ...DEFAULT_VIEW_SETTINGS },
    highlightRules: [...DEFAULT_HIGHLIGHT_RULES],
    currentExtension: 'default',
  })

  // Auto-save on changes
  createEffect(() => {
    if (state.currentExtension) {
      saveConfigForExtension(
        state.currentExtension,
        state.settings,
        state.highlightRules,
      )
    }
  })

  const actions: ViewActions = {
    updateSettings: (partial: Partial<ViewSettings>) => {
      setState('settings', (prev) => ({ ...prev, ...partial }))
    },

    setNewLineConfig: (config: ViewSettings['newLineConfig']) => {
      setState('settings', 'newLineConfig', config)
    },

    addHighlightRule: (rule: HighlightRule) => {
      setState('highlightRules', (prev) => [...prev, rule])
    },

    updateHighlightRule: (id: string, updates: Partial<HighlightRule>) => {
      setState('highlightRules', (rules) =>
        rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      )
    },

    removeHighlightRule: (id: string) => {
      setState('highlightRules', (rules) => rules.filter((r) => r.id !== id))
    },

    loadForFile: (fileName: string) => {
      const ext = getExtension(fileName)
      setState('currentExtension', ext)

      const saved = loadConfigForExtension(ext)
      if (saved) {
        setState({
          settings: saved.viewSettings,
          highlightRules: saved.highlightRules,
        })
      } else {
        // Use defaults
        setState({
          settings: { ...DEFAULT_VIEW_SETTINGS },
          highlightRules: [...DEFAULT_HIGHLIGHT_RULES],
        })
      }
    },

    saveConfig: () => {
      saveConfigForExtension(
        state.currentExtension,
        state.settings,
        state.highlightRules,
      )
    },
  }

  return (
    <ViewContext.Provider value={[state, actions]}>
      {props.children}
    </ViewContext.Provider>
  )
}

export function useView() {
  const context = useContext(ViewContext)
  if (!context) {
    throw new Error('useView must be used within a ViewProvider')
  }
  return context
}
