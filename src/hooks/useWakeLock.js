import { useEffect, useRef, useState } from 'react'

const supported =
  typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof window !== 'undefined' && window.isSecureContext

/**
 * Hold a screen wake lock while `enabled`. The browser drops the lock when
 * the tab is hidden, so it is re-requested on visibilitychange.
 *
 * @returns {{ supported: boolean, active: boolean, error: string | null }}
 */
export function useWakeLock(enabled) {
  const [active, setActive] = useState(false)
  const [error, setError] = useState(null)
  const sentinel = useRef(null)

  useEffect(() => {
    if (!enabled || !supported) return undefined
    let cancelled = false

    async function acquire() {
      if (sentinel.current || document.visibilityState !== 'visible') return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release()
          return
        }
        sentinel.current = lock
        setActive(true)
        setError(null)
        lock.addEventListener('release', () => {
          if (sentinel.current === lock) sentinel.current = null
          setActive(false)
        })
      } catch (e) {
        setError(e?.message ?? String(e))
        setActive(false)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel.current?.release()
      sentinel.current = null
      setActive(false)
    }
  }, [enabled])

  return { supported, active, error }
}
