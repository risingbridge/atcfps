import { createContext, useContext } from 'react'

export const StoreContext = createContext(null)

/** @returns {{ state: import('./store.js').AppState, dispatch: Function }} */
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/** The active board plus a dispatch already bound to its id. */
export function useActiveBoard() {
  const { state, dispatch } = useStore()
  return { board: state.boards[state.activeBoardId], dispatch }
}
