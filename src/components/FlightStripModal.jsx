import { useEffect, useRef, useState } from 'react'
import { FLIGHT_FIELDS, FLIGHT_KINDS, FLIGHT_KIND_META, normalizeFlightKind } from '../lib/stripTypes.js'
import ColorPicker from './ColorPicker.jsx'

const LABELS = {
  callsign: 'Callsign',
  aircraftType: 'Type',
  route: 'Route',
  requestedAltitude: 'Requested',
  clearedAltitude: 'Cleared',
  squawk: 'Squawk',
  remarks: 'Remarks',
}

function blank() {
  return Object.fromEntries(FLIGHT_FIELDS.map((f) => [f, '']))
}

function pickFields(src) {
  if (!src) return {}
  return Object.fromEntries(FLIGHT_FIELDS.filter((f) => src[f] != null).map((f) => [f, src[f]]))
}

/**
 * Create/edit form for flight strips. Mount it to open; it calls onClose when
 * dismissed (Esc, backdrop, Cancel) and onSubmit(fields) on save.
 */
export default function FlightStripModal({ initial, onSubmit, onClose, onDelete }) {
  const ref = useRef(null)
  const [fields, setFields] = useState(() => ({ ...blank(), ...pickFields(initial) }))
  const [color, setColor] = useState(initial?.colorOverride ?? '')
  const [kind, setKind] = useState(() => normalizeFlightKind(initial?.flightKind))
  const editing = !!initial

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    dlg.querySelector('input')?.focus()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  function set(field) {
    return (e) => setFields((f) => ({ ...f, [field]: e.target.value }))
  }

  function submit(e) {
    e.preventDefault()
    const trimmed = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.trim()]))
    if (!trimmed.callsign) return
    const out = { ...trimmed, flightKind: kind }
    onSubmit(editing ? { ...out, colorOverride: color || undefined } : out)
    ref.current.close()
  }

  return (
    <dialog
      ref={ref}
      className="modal"
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close() // backdrop click
      }}
    >
      <form className="modal-body" onSubmit={submit}>
        <h2 className="modal-title">{editing ? 'Edit flight strip' : 'New flight strip'}</h2>
        <div className="segmented" role="radiogroup" aria-label="Flight kind">
          {FLIGHT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className={`segment ${kind === k ? 'is-selected' : ''}`}
              data-kind={k}
              onClick={() => setKind(k)}
            >
              {FLIGHT_KIND_META[k].label}
            </button>
          ))}
        </div>
        <div className="field-grid">
          {FLIGHT_FIELDS.filter((f) => f !== 'remarks').map((f) => (
            <label key={f} className="field">
              <span className="field-label">{LABELS[f]}</span>
              <input
                className="input input-data"
                value={fields[f]}
                onChange={set(f)}
                required={f === 'callsign'}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ))}
          <label className="field field-wide">
            <span className="field-label">{LABELS.remarks}</span>
            <textarea className="input" rows={2} value={fields.remarks} onChange={set('remarks')} />
          </label>
          {editing && (
            <div className="field-wide">
              <ColorPicker value={color} onChange={setColor} />
            </div>
          )}
        </div>
        <div className="modal-actions">
          {editing && onDelete && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={() => ref.current.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
