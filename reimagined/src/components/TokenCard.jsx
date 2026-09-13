import { useEffect, useRef, useState } from 'react'
import { formatZulu } from '../lib/time.js'
import { actions } from '../model/store.js'
import { pathFor, placeById } from '../model/template.js'
import { useRunway } from '../state/storeContext.js'
import Keypad from './Keypad.jsx'

const FIELDS = [
  ['callsign', 'Callsign'],
  ['type', 'Type'],
  ['clearedLevel', 'Cleared'],
  ['squawk', 'Squawk'],
  ['wake', 'Wake'],
  ['runway', 'Runway'],
  ['stand', 'Stand'],
  ['eta', 'ETA'],
]

const EVENT_TEXT = {
  received: (e) => `received → ${e.to}`,
  move: (e) => `${e.from} → ${e.to}`,
  advance: (e) => `${e.from} → ${e.to}`,
  back: (e) => `${e.from} ← ${e.to}`,
  'go-around': (e) => `GO-AROUND from ${e.from}`,
  transferred: (e) => `transferred${e.detail ? ` to ${e.detail}` : ''}`,
  removed: () => 'removed',
  field: (e) => e.detail,
  timer: (e) => e.detail,
  note: (e) => e.detail,
}

/** The expanded token: fields (keypad-edited), actions, and its log. */
export default function TokenCard({ token, onClose }) {
  const { runway, dispatch } = useRunway()
  const ref = useRef(null)
  const [editing, setEditing] = useState(null) // field key
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const h = () => onClose()
    dlg.addEventListener('close', h)
    return () => dlg.removeEventListener('close', h)
  }, [onClose])

  if (!token) return null
  const path = pathFor(runway, token.intent)
  const i = path.indexOf(token.placeId)
  const next = i >= 0 ? path[(i + 1) % path.length] : token.intent === 'circuit' && token.placeId === 'inbound' ? path[0] : null
  const canAdvance = token.intent !== 'none' && next && !(token.intent !== 'circuit' && i === path.length - 1)
  const placeName = (id) => placeById(runway, id)?.name ?? id
  const flight = token.kind === 'ifr' || token.kind === 'vfr'

  function commitField() {
    dispatch(actions.updateToken(token.id, { [editing]: draft }))
    setEditing(null)
  }

  return (
    <dialog ref={ref} className="sheet card" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="sheet-body">
        <header className="card-head" data-frame={token.kind === 'vehicle' ? 'vehicle' : token.kind === 'info' ? 'info' : token.intent}>
          <span className="card-callsign">{token.callsign}</span>
          <span className="card-place">{placeName(token.placeId)}</span>
          {flight && (
            <select className="select" value={token.intent} onChange={(e) => dispatch(actions.setIntent(token.id, e.target.value))} aria-label="Intent">
              <option value="land">Landing</option>
              <option value="circuit">Circuit</option>
              <option value="depart">Departing</option>
              <option value="none">Parked</option>
            </select>
          )}
          <span className="spacer" />
          <button className="btn" onClick={() => ref.current.close()}>
            Close
          </button>
        </header>

        {token.intent !== 'none' && (
          <div className="card-actions">
            <button className="btn btn-big" onClick={() => dispatch(actions.back(token.id))}>
              ◂ Back
            </button>
            {(token.placeId === 'final' || token.placeId === 'shortfinal' || token.placeId === 'runway') && (
              <button className="btn btn-big btn-danger" onClick={() => dispatch(actions.goAround(token.id))}>
                Go-around
              </button>
            )}
            <button className="btn btn-big btn-primary" onClick={() => dispatch(actions.advance(token.id))} disabled={!canAdvance}>
              {canAdvance ? `${placeName(next)} ▸` : 'Done'}
            </button>
          </div>
        )}

        <div className="card-fields">
          {(flight ? FIELDS : [['callsign', token.kind === 'vehicle' ? 'Vehicle' : 'Message']]).map(([key, label]) => (
            <button key={key} type="button" className={`entry-field ${editing === key ? 'is-active' : ''}`} onClick={() => { setEditing(key); setDraft(token[key] ?? '') }}>
              <span className="entry-label">{label}</span>
              <span className="entry-value">{token[key] || <span className="entry-placeholder">—</span>}</span>
            </button>
          ))}
        </div>
        {editing && <Keypad value={draft} onChange={setDraft} onDone={commitField} doneLabel="Set" />}

        <div className="card-timers">
          <span className="entry-label">Timer</span>
          {[2, 5, 10].map((m) => (
            <button key={m} className="btn" onClick={() => dispatch(actions.addTimer(token.id, new Date(Date.now() + m * 60_000).toISOString(), `+${m} min`))}>
              +{m}
            </button>
          ))}
          {token.timers.map((t) => (
            <button key={t.id} className="btn btn-quiet timer-chip" onClick={() => dispatch(actions.clearTimer(token.id, t.id))} title="Tap to clear">
              ⏱ {formatZulu(t.at)} {t.label} ✕
            </button>
          ))}
        </div>

        <div className="card-foot">
          <button className="btn btn-quiet" onClick={() => { dispatch(actions.transfer(token.id)); ref.current.close() }}>
            Transfer
          </button>
          <button className="btn btn-quiet btn-danger" onClick={() => { dispatch(actions.removeToken(token.id)); ref.current.close() }}>
            Remove
          </button>
        </div>

        <ol className="log" aria-label="Event log">
          {[...token.events].reverse().map((e, idx) => (
            <li key={idx} className={`log-item log-${e.type}`}>
              <span className="log-time">{formatZulu(e.at)}</span>
              <span className="log-text">{(EVENT_TEXT[e.type] ?? (() => e.type))(e)}</span>
            </li>
          ))}
        </ol>
      </div>
    </dialog>
  )
}
