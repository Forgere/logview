import { createContext, createEffect, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { ParentProps } from 'solid-js'
import type { HighlightRule, ViewSettings } from '~/types'
import { DEFAULT_HIGHLIGHT_RULES, DEFAULT_VIEW_SETTINGS } from '~/types'
import {
  getExtension,
  loadConfigForExtension,
  saveConfigForExtension,
} from '~/services/configService'

interface ViewState {
  settings: ViewSettings
  highlightRules: Array<HighlightRule>
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

  // Guards the auto-save effect below: it must stay false until the `default`
  // bucket has been restored. Otherwise the effect's first run (which sees
  // pristine DEFAULT_VIEW_SETTINGS) would overwrite the user's saved config
  // with defaults before anything ever reads it.
  let restored = false

  // Hydrate the `default` bucket on the client so fontSize / wrapLines /
  // rowHeight / highlight rules survive a refresh even before a file is picked.
  // `loadForFile` still wins afterwards: a matching extension bucket overrides
  // these defaults when the user opens a file.
  onMount(() => {
    const saved = loadConfigForExtension('default')
    if (saved) {
      setState({
        settings: saved.viewSettings,
        highlightRules: saved.highlightRules,
      })
    }
    restored = true
  })

  // Auto-save on changes. The store fields are read *before* the `restored`
  // gate, so the effect always tracks them: returning before any read would
  // leave it with no dependencies and it would never re-run.
  createEffect(() => {
    const settings = state.settings
    const rules = state.highlightRules
    const extension = state.currentExtension
    if (!restored) return
    saveConfigForExtension(extension, settings, rules)
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
