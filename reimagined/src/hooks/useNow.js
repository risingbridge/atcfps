import { useEffect, useState } from 'react'

/** Current time (ms), re-rendering every `intervalMs`; pauses while hidden. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let id = null
    const start = () => {
      setNow(Date.now())
      clearInterval(id)
      id = setInterval(() => setNow(Date.now()), intervalMs)
    }
    const onVis = () => (document.visibilityState === 'visible' ? start() : clearInterval(id))
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [intervalMs])
  return now
}
