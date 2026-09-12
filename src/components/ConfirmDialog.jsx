import { useEffect, useRef, useState } from 'react'

/**
 * One <dialog> that serves both confirm and prompt requests. Rendered by
 * DialogProvider; `request` is { kind, title, message, defaultValue,
 * confirmLabel, danger, resolve }.
 */
export default function ConfirmDialog({ request, onDone }) {
  const ref = useRef(null)
  const [value, setValue] = useState(request.defaultValue ?? '')
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    dlg.querySelector('input, button[type="submit"]')?.focus()
    dlg.querySelector('input')?.select()
    const onClose = () =>
      onDone(dlg.returnValue === 'ok' ? (request.kind === 'prompt' ? valueRef.current : true) : null)
    dlg.addEventListener('close', onClose)
    return () => dlg.removeEventListener('close', onClose)
  }, [onDone, request.kind])

  function submit(e) {
    e.preventDefault()
    if (request.kind === 'prompt' && !value.trim()) return
    ref.current.close('ok')
  }

  return (
    <dialog
      ref={ref}
      className="modal modal-sm"
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <form className="modal-body" onSubmit={submit}>
        {request.title && <h2 className="modal-title">{request.title}</h2>}
        {request.message && <p className="modal-text">{request.message}</p>}
        {request.kind === 'prompt' && (
          <input
            className="input"
            style={{ width: '100%' }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={request.title ?? 'Value'}
          />
        )}
        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={() => ref.current.close()}>
            Cancel
          </button>
          <button type="submit" className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`}>
            {request.confirmLabel ?? (request.kind === 'prompt' ? 'OK' : 'Confirm')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
