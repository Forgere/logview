import { createContext, useContext, type ParentProps } from 'solid-js'
import { createStore } from 'solid-js/store'

type ModalName =
  | 'settings'
  | 'highlights'
  | 'watch'
  | 'compare'
  | 'analysis'
  | 'goToLine'
  | 'shortcuts'

interface ModalState {
  openModal: ModalName | null
}

interface ModalActions {
  open: (name: ModalName) => void
  close: () => void
  isOpen: (name: ModalName) => boolean
}

type ModalStore = [ModalState, ModalActions]

const ModalContext = createContext<ModalStore>()

export function ModalProvider(props: ParentProps) {
  const [state, setState] = createStore<ModalState>({
    openModal: null,
  })

  const actions: ModalActions = {
    open: (name: ModalName) => {
      setState('openModal', name)
    },

    close: () => {
      setState('openModal', null)
    },

    isOpen: (name: ModalName) => {
      return state.openModal === name
    },
  }

  return (
    <ModalContext.Provider value={[state, actions]}>
      {props.children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
