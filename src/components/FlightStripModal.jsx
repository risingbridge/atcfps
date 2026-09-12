import { useEffect, useRef, useState } from 'react'
import { FLIGHT_FIELDS } from '../lib/stripTypes.js'

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

/**
 * Create/edit form for flight strips. Mount it to open; it calls onClose when
 * dismissed (Esc, backdrop, Cancel) and onSubmit(fields) on save.
 */
export default function FlightStripModal({ initial, onSubmit, onClose, onDelete }) {
  const ref = useRef(null)
  const [fields, setFields] = useState(() => ({ ...blank(), ...(initial ?? {}) }))
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
    onSubmit(trimmed)
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
