import { useEffect, useRef, useState } from 'react'
import { actions } from '../model/store.js'
import { PLACE_KINDS } from '../model/template.js'
import { useStore } from '../state/storeContext.js'

/**
 * Runway settings: which end is in use, the places (rename / kind /
 * reorder / add / remove), vehicle areas, crossing runways, and the list
 * of runways itself.
 */
export default function RunwaySheet({ onClose }) {
  const { state, dispatch } = useStore()
  const ref = useRef(null)
  const runway = state.runways[state.activeRunwayId]
  const [draft, setDraft] = useState(() => runway.places.map((p) => ({ ...p })))
  const [area, setArea] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const h = () => onClose()
    dlg.addEventListener('close', h)
    return () => dlg.removeEventListener('close', h)
  }, [onClose])

  const lockedLanes = ['inbound', 'outbound', 'park', 'vehicles']
  const editable = draft.filter((p) => !lockedLanes.includes(p.id) && p.kind !== 'exit')
  const setPlace = (id, patch) => setDraft(draft.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const move = (id, d) => {
    const i = draft.findIndex((p) => p.id === id)
    const j = i + d
    if (j < 0 || j >= draft.length || lockedLanes.includes(draft[j].id) || draft[j].kind === 'exit') return
    const next = [...draft]
    ;[next[i], next[j]] = [next[j], next[i]]
    setDraft(next)
  }
  const addPlace = (kind) => {
    const base = kind === 'dep' ? 'step' : 'leg'
    let n = 1
    while (draft.some((p) => p.id === `${base}${n}`)) n += 1
    const rwyIndex = draft.findIndex((p) => p.kind === 'runway')
    const entry = { id: `${base}${n}`, name: kind === 'dep' ? `Step ${n}` : `Leg ${n}`, kind }
    const next = [...draft]
    next.splice(kind === 'dep' ? rwyIndex : rwyIndex, 0, entry) // before the runway; user reorders
    setDraft(next)
  }
  const savePlaces = () => dispatch(actions.setPlaces(runway.id, draft))
  const placesChanged = JSON.stringify(draft) !== JSON.stringify(runway.places)
  const oneRunway = draft.filter((p) => p.kind === 'runway').length === 1

  return (
    <dialog ref={ref} className="sheet" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="sheet-body">
        <header className="card-head">
          <span className="card-callsign">RWY {runway.inUse}</span>
          <span className="card-place">{runway.name} / {runway.reciprocal}</span>
          <button className="btn" onClick={() => dispatch(actions.flipRunway(runway.id))}>
            Use {runway.inUse === runway.name ? runway.reciprocal : runway.name}
          </button>
          <span className="spacer" />
          <button className="btn" onClick={() => ref.current.close()}>
            Close
          </button>
        </header>

        <section>
          <h3 className="section-title">Places</h3>
          <p className="help">The ring is the order shown; the runway is where both flows meet. Lanes and exits are fixed.</p>
          <ul className="place-list">
            {editable.map((p) => (
              <li key={p.id} className={`place-row ${p.kind === 'runway' ? 'is-runway' : ''}`}>
                <input className="input" value={p.name} onChange={(e) => setPlace(p.id, { name: e.target.value })} aria-label={`Name of ${p.id}`} />
                <select className="select" value={p.kind} onChange={(e) => setPlace(p.id, { kind: e.target.value })} aria-label="Kind" disabled={p.kind === 'runway'}>
                  {PLACE_KINDS.filter((k) => k !== 'lane' && k !== 'exit').map((k) => (
                    <option key={k} value={k}>{k === 'dep' ? 'departure step' : k === 'ring' ? 'circuit leg' : k}</option>
                  ))}
                </select>
                <button className="btn" onClick={() => move(p.id, -1)} aria-label="Move up">▲</button>
                <button className="btn" onClick={() => move(p.id, 1)} aria-label="Move down">▼</button>
                <button className="btn btn-quiet" onClick={() => setDraft(draft.filter((q) => q.id !== p.id))} disabled={p.kind === 'runway'} aria-label="Remove">✕</button>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="btn" onClick={() => addPlace('ring')}>+ circuit leg</button>
            <button className="btn" onClick={() => addPlace('dep')}>+ departure step</button>
            <span className="spacer" />
            <button className="btn btn-primary" onClick={savePlaces} disabled={!placesChanged || !oneRunway}>
              Save places
            </button>
          </div>
        </section>

        <section>
          <h3 className="section-title">Vehicle areas</h3>
          <div className="row">
            {runway.areas.map((a) => (
              <button key={a} className="btn btn-chip" onClick={() => dispatch(actions.updateRunway(runway.id, { areas: runway.areas.filter((x) => x !== a) }))} title="Remove">
                {a} ✕
              </button>
            ))}
            <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="TWY C" aria-label="New area" />
            <button className="btn" onClick={() => { if (area.trim()) dispatch(actions.updateRunway(runway.id, { areas: [...runway.areas, area] })); setArea('') }}>
              Add
            </button>
          </div>
        </section>

        <section>
          <h3 className="section-title">Runways</h3>
          <div className="row">
            {state.runwayOrder.map((id) => {
              const r = state.runways[id]
              const crosses = runway.crossing?.includes(id)
              return (
                <span key={id} className="runway-chip">
                  <button className={`btn ${id === runway.id ? 'btn-primary' : ''}`} onClick={() => dispatch(actions.setActiveRunway(id))}>
                    {r.name}/{r.reciprocal}
                  </button>
                  {id !== runway.id && (
                    <button className={`btn btn-small ${crosses ? 'btn-danger' : 'btn-quiet'}`} onClick={() => dispatch(actions.updateRunway(runway.id, { crossing: crosses ? runway.crossing.filter((x) => x !== id) : [...(runway.crossing ?? []), id] }))} title="Crossing runways share the occupancy rule">
                      {crosses ? 'crosses ✕' : 'crosses?'}
                    </button>
                  )}
                </span>
              )
            })}
          </div>
          <div className="row">
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New runway, e.g. 12" aria-label="New runway name" />
            <button className="btn" onClick={() => { if (newName.trim()) dispatch(actions.addRunway(newName.trim(), reciprocalOf(newName.trim()), runway.id)); setNewName('') }}>
              Add (copy of this one)
            </button>
            <span className="spacer" />
            <button className="btn btn-quiet btn-danger" onClick={() => dispatch(actions.removeRunway(runway.id))} disabled={state.runwayOrder.length <= 1}>
              Remove this runway
            </button>
          </div>
        </section>
      </div>
    </dialog>
  )
}

/** "12" → "30", "01L" → "19R". Best effort; the user can edit. */
function reciprocalOf(name) {
  const m = /^(\d{1,2})([LRC]?)$/.exec(name)
  if (!m) return ''
  const n = ((Number(m[1]) + 18 - 1) % 36) + 1
  const side = { L: 'R', R: 'L', C: 'C' }[m[2]] ?? ''
  return `${String(n).padStart(2, '0')}${side}`
}
