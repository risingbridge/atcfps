import { useEffect, useRef, useState } from 'react'

/** Edit a divider's label, or remove it. */
export default function DividerModal({ strip, onSubmit, onClose, onDelete }) {
  const ref = useRef(null)
  const [label, setLabel] = useState(strip.label ?? '')

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  function submit(e) {
    e.preventDefault()
    onSubmit({ label: label.trim() })
    ref.current.close()
  }

  return (
    <dialog ref={ref} className="modal modal-sm" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <form className="modal-body" onSubmit={submit}>
        <h2 className="modal-title">Divider</h2>
        <label className="field">
          <span className="field-label">Label (optional)</span>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus autoComplete="off" />
        </label>
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
