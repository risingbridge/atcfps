import { useMemo } from 'react'
import { usePersistedReducer } from '../hooks/usePersistedReducer.js'
import { initialState, reducer } from '../model/store.js'
import { StoreContext } from './storeContext.js'

export default function StoreProvider({ children }) {
  const [state, dispatch] = usePersistedReducer(reducer, initialState)
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
