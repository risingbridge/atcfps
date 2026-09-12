import { useEffect, useState } from 'react'

/** Current time (ms), re-rendering every `intervalMs`. Pauses while the tab is hidden. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let id = null
    const start = () => {
      setNow(Date.now())
      clearInterval(id)
      id = setInterval(() => setNow(Date.now()), intervalMs)
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : clearInterval(id))
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])
  return now
}
