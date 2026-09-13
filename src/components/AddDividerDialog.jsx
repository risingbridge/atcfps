import { useEffect, useRef, useState } from 'react'
import { actions } from '../state/store.js'
import { useActiveBoard, useStore } from '../state/storeContext.js'

/** Add a divider to `bayId`: a preset label (one tap) or free text; blank = plain line. */
export default function AddDividerDialog({ bayId, onClose }) {
  const { board, dispatch } = useActiveBoard()
  const { state } = useStore()
  const ref = useRef(null)
  const [label, setLabel] = useState('')
  const presets = state.settings.presets?.divider ?? []

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  function add(text) {
    dispatch(actions.createDivider(board.id, bayId, text))
    ref.current.close()
  }

  return (
    <dialog ref={ref} className="modal modal-sm" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <form
        className="modal-body"
        onSubmit={(e) => {
          e.preventDefault()
          add(label)
        }}
      >
        <h2 className="modal-title">
          Add divider <span className="modal-title-meta">{board.bays[bayId]?.name}</span>
        </h2>
        {presets.length > 0 && (
          <div className="quick-chips" role="group" aria-label="Divider presets" style={{ marginBottom: 'var(--s-3)' }}>
            {presets.map((p) => (
              <button key={p.label} type="button" className="btn btn-chip" data-type="divider" onClick={() => add(p.label)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span className="field-label">Label (optional)</span>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus autoComplete="off" placeholder="e.g. CLEARED TO LAND" />
        </label>
        <p className="settings-help" style={{ marginTop: 'var(--s-2)' }}>
          Added at the bottom of the bay — drag it into place.
        </p>
        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={() => ref.current.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </div>
      </form>
    </dialog>
  )
}
