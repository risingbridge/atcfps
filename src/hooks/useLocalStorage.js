import { useEffect, useReducer } from 'react'
import { load, save } from '../lib/storage.js'

/**
 * useReducer backed by localStorage: lazily initialised from storage (falling
 * back to `init()`), and written back on every state change.
 */
export function usePersistedReducer(reducer, init) {
  const [state, dispatch] = useReducer(reducer, undefined, () => load() ?? init())
  useEffect(() => {
    save(state)
  }, [state])
  return [state, dispatch]
}
