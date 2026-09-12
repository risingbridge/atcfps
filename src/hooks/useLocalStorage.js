import { useEffect, useReducer, useRef } from 'react'
import { STORAGE_KEY, load, save, serialize } from '../lib/storage.js'

/**
 * useReducer backed by localStorage: lazily initialised from storage (falling
 * back to `init()`), written back on every state change, and kept in sync
 * with other tabs on the same origin (a `storage` event carrying a value we
 * didn't write ourselves replaces the state, so two tabs can't clobber
 * each other's saves).
 */
export function usePersistedReducer(reducer, init) {
  const [state, dispatch] = useReducer(reducer, undefined, () => load() ?? init())
  const lastSaved = useRef(null)

  useEffect(() => {
    lastSaved.current = serialize(state)
    save(state)
  }, [state])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || e.newValue == null || e.newValue === lastSaved.current) return
      const next = load()
      if (next) dispatch({ type: 'replaceState', state: next })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [state, dispatch]
}
