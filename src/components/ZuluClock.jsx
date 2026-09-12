import { useNow } from '../hooks/useNow.js'

const pad = (n) => String(n).padStart(2, '0')

/** UTC clock, ticking every second (pauses while the tab is hidden). */
export default function ZuluClock() {
  const now = new Date(useNow(1000))
  const hhmm = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`
  return (
    <time className="zulu-clock" dateTime={now.toISOString()} title="UTC" aria-label={`${hhmm} UTC`}>
      {hhmm}
      <span className="zulu-clock-sec">:{pad(now.getUTCSeconds())}</span>
      <span className="zulu-clock-z">Z</span>
    </time>
  )
}
