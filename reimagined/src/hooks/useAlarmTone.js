import { useEffect } from 'react'
import { setAlarm, unlockAudio } from '../lib/tone.js'

/** Sounds while there is an alarm-level alert and sound is not muted. */
export function useAlarmTone(active, enabled) {
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  useEffect(() => {
    setAlarm(active && enabled)
    return () => setAlarm(false)
  }, [active, enabled])
}
