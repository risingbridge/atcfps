import { formatClock } from '../lib/time.js'

/** Clock, runway in use, and the "new token" button. Alerts arrive in R4. */
export default function AttentionBar({ now, runway, runways, onRunway, profile, onProfile, onNew, onRunwaySettings, alerts, sound, onSound, onFocus }) {
  const { hm, s } = formatClock(now)
  const alarm = alerts.some((a) => a.level === 'alarm')
  return (
    <header className={`bar ${alarm ? 'is-alarm' : ''}`}>
      <time className="clock" dateTime={new Date(now).toISOString()}>
        {hm}
        <span className="clock-s">:{s}</span>
        <span className="clock-z">Z</span>
      </time>
      {runways.length > 1 ? (
        <select className="select" value={runway.id} onChange={(e) => onRunway(e.target.value)} aria-label="Active runway">
          {runways.map((r) => (
            <option key={r.id} value={r.id}>RWY {r.inUse}</option>
          ))}
        </select>
      ) : null}
      <button className="btn" onClick={onRunwaySettings} title="Runway settings">
        RWY {runway.inUse} ⚙
      </button>
      <select className="select" value={profile} onChange={(e) => onProfile(e.target.value)} aria-label="Position profile" title="Which lanes are shown">
        <option value="combined">Tower + ground</option>
        <option value="tower">Tower only</option>
      </select>
      <div className="alerts" role="status" aria-live="polite">
        {alerts.length === 0 ? (
          <span className="alert alert-none">no alerts</span>
        ) : (
          alerts.map((a) => (
            <button key={a.id} className={`alert alert-${a.level}`} onClick={() => onFocus?.(a)} title="Show">
              {a.level === 'alarm' ? '⚠ ' : ''}
              {a.text}
            </button>
          ))
        )}
      </div>
      <span className="spacer" />
      <button className={`btn ${sound ? '' : 'btn-danger'}`} onClick={() => onSound(!sound)} title={sound ? 'Sound on — tap to mute' : 'MUTED — tap to unmute'} aria-pressed={!sound}>
        {sound ? '🔔' : '🔕 muted'}
      </button>
      <button className="btn btn-primary" onClick={onNew}>
        + New
      </button>
    </header>
  )
}
