import { useEffect, useRef, useState } from 'react'
import { recall } from '../lib/recall.js'
import { actions } from '../model/store.js'
import { useStore } from '../state/storeContext.js'
import Keypad from './Keypad.jsx'

const KINDS = [
  { id: 'ifr', label: 'IFR' },
  { id: 'vfr', label: 'VFR' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'info', label: 'Info' },
]
const INTENTS = [
  { id: 'land', label: 'Landing' },
  { id: 'circuit', label: 'Circuit' },
  { id: 'depart', label: 'Departing' },
]

/**
 * Create a token in two taps for regular traffic: pick the kind, type a
 * callsign prefix on the keypad, tap a recalled flight (fills type, wake,
 * runway, stand, intent). Free entry otherwise.
 */
export default function NewTokenSheet({ onClose, defaultKind = 'ifr' }) {
  const { state, dispatch } = useStore()
  const ref = useRef(null)
  const [kind, setKind] = useState(defaultKind)
  const [intent, setIntent] = useState(defaultKind === 'vfr' ? 'circuit' : 'land')
  const [callsign, setCallsign] = useState('')
  const [type, setType] = useState('')
  const [field, setField] = useState('callsign') // which field the keypad edits

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const h = () => onClose()
    dlg.addEventListener('close', h)
    return () => dlg.removeEventListener('close', h)
  }, [onClose])

  const flight = kind === 'ifr' || kind === 'vfr'
  const suggestions = flight ? recall(state, callsign) : []

  function create(extra = {}) {
    const cs = callsign.trim()
    if (!cs) return
    const placeId = !flight ? null : intent === 'depart' ? 'outbound' : 'inbound'
    dispatch(actions.createToken(kind, { callsign: cs, type: type.trim(), intent: flight ? intent : 'none', ...extra }, placeId))
    ref.current.close()
  }

  function pick(s) {
    setCallsign(s.callsign)
    setType(s.type)
    if (s.kind !== kind) setKind(s.kind)
    create({ callsign: s.callsign, type: s.type, wake: s.wake, runway: s.runway, stand: s.stand })
  }

  const value = field === 'callsign' ? callsign : type
  const setValue = field === 'callsign' ? setCallsign : setType

  return (
    <dialog ref={ref} className="sheet" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="sheet-body">
        <div className="segmented" role="radiogroup" aria-label="Kind">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`segment ${kind === k.id ? 'is-selected' : ''}`} data-frame={k.id} onClick={() => { setKind(k.id); if (k.id === 'vfr') setIntent('circuit'); if (k.id === 'ifr') setIntent('land') }}>
              {k.label}
            </button>
          ))}
        </div>
        {flight && (
          <div className="segmented segmented-sm" role="radiogroup" aria-label="Intent">
            {INTENTS.map((i) => (
              <button key={i.id} type="button" role="radio" aria-checked={intent === i.id} className={`segment ${intent === i.id ? 'is-selected' : ''}`} data-frame={i.id} onClick={() => setIntent(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        )}

        <div className="entry-fields">
          <button type="button" className={`entry-field ${field === 'callsign' ? 'is-active' : ''}`} onClick={() => setField('callsign')}>
            <span className="entry-label">{kind === 'vehicle' ? 'Vehicle' : kind === 'info' ? 'Message' : 'Callsign'}</span>
            <span className="entry-value">{callsign || <span className="entry-placeholder">type…</span>}</span>
          </button>
          {flight && (
            <button type="button" className={`entry-field ${field === 'type' ? 'is-active' : ''}`} onClick={() => setField('type')}>
              <span className="entry-label">Type</span>
              <span className="entry-value">{type || <span className="entry-placeholder">A320…</span>}</span>
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="recall" role="group" aria-label="Recalled flights">
            {suggestions.map((s) => (
              <button key={s.callsign} type="button" className="recall-item" data-frame={s.kind === 'vfr' ? 'circuit' : s.intent} onClick={() => pick(s)}>
                <span className="recall-callsign">{s.callsign}</span>
                <span className="recall-meta">{[s.type, s.wake, s.stand].filter(Boolean).join(' · ') || s.kind.toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}

        <Keypad value={value} onChange={setValue} onDone={() => create()} doneLabel={callsign.trim() ? 'Add' : 'Cancel'} />
      </div>
    </dialog>
  )
}
