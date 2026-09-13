import { createContext, useContext } from 'react'

export const StoreContext = createContext(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/** The active runway plus dispatch. */
export function useRunway() {
  const { state, dispatch } = useStore()
  return { runway: state.runways[state.activeRunwayId], state, dispatch }
}
