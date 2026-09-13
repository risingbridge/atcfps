import { formatClock } from '../lib/time.js'

/** Clock, runway in use, and the "new token" button. Alerts arrive in R4. */
export default function AttentionBar({ now, runway, profile, onProfile, onNew, onFlip }) {
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
      <select className="select" value={profile} onChange={(e) => onProfile(e.target.value)} aria-label="Position profile" title="Which lanes are shown">
        <option value="combined">Tower + ground</option>
        <option value="tower">Tower only</option>
      </select>
      <span className="spacer" />
      <button className="btn btn-primary" onClick={onNew}>
        + New
      </button>
    </header>
  )
}
