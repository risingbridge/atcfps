import { formatClock } from '../lib/time.js'

/** Clock, runway in use, and the "new token" button. Alerts arrive in R4. */
export default function AttentionBar({ now, runway, onNew, onFlip }) {
  const { hm, s } = formatClock(now)
  return (
    <header className="bar">
      <time className="clock" dateTime={new Date(now).toISOString()}>
        {hm}
        <span className="clock-s">:{s}</span>
        <span className="clock-z">Z</span>
      </time>
      <button className="btn" onClick={onFlip} title="Change runway in use">
        RWY {runway.inUse}
      </button>
      <span className="spacer" />
      <button className="btn btn-primary" onClick={onNew}>
        + New
      </button>
    </header>
  )
}
