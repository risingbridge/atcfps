import { useEffect, useRef, useState } from 'react'
import { getStripType } from '../lib/stripTypes.js'
import { formatZulu } from '../lib/time.js'
import ColorPicker from './ColorPicker.jsx'
import SpanControl from './SpanControl.jsx'

/** Edit the quick field + notes (+ highlight) of an info or vehicle strip. */
export default function EditNotesModal({ strip, onSubmit, onClose, onDelete, span }) {
  const ref = useRef(null)
  const def = getStripType(strip.type)
  const [quick, setQuick] = useState(strip[def.quickField] ?? '')
  const [notes, setNotes] = useState(strip.notes ?? '')
  const [color, setColor] = useState(strip.colorOverride ?? '')
  const [spanWith, setSpanWith] = useState(span?.value ?? null)

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  function submit(e) {
    e.preventDefault()
    if (!quick.trim()) return
    onSubmit({
      [def.quickField]: quick.trim(),
      notes: notes.trim(),
      colorOverride: color || undefined,
      ...(span ? { spanWith } : {}),
    })
    ref.current.close()
  }

  return (
    <dialog ref={ref} className="modal" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <form className="modal-body" onSubmit={submit}>
        <h2 className="modal-title">
          Edit {def.label.toLowerCase()} strip
          {strip.type === 'info' && <span className="modal-title-meta">{formatZulu(strip.createdAt)}</span>}
        </h2>
        <div className="field-grid field-grid-1">
          <label className="field">
            <span className="field-label">{def.quickLabel}</span>
            <input className="input" value={quick} onChange={(e) => setQuick(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="field-row">
            <ColorPicker value={color} onChange={setColor} />
            {span && <SpanControl value={spanWith} options={span.options} onChange={setSpanWith} />}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Remove
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={() => ref.current.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </dialog>
  )
}
