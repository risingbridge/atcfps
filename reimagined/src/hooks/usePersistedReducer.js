import { useEffect, useReducer, useRef } from 'react'
import { STORAGE_KEY, load, save, serialize } from '../lib/storage.js'

/** useReducer backed by localStorage, synced across tabs via the storage event. */
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
