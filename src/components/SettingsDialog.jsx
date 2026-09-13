import { useEffect, useRef, useState } from 'react'
import { actions, shiftInOrder } from '../state/store.js'
import { useStore } from '../state/storeContext.js'

/** App settings. First section: the regular vehicles offered as one-tap quick-add. */
export default function SettingsDialog({ onClose }) {
  const { state, dispatch } = useStore()
  const ref = useRef(null)
  const inputRef = useRef(null)
  const [draft, setDraft] = useState('')
  const vehicles = state.settings.vehicles ?? []

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    inputRef.current?.focus()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  const set = (list) => dispatch(actions.setVehicles(list))

  function add(e) {
    e.preventDefault()
    const name = draft.trim()
    if (!name) return
    set([...vehicles, name])
    setDraft('')
    inputRef.current?.focus()
  }

  const exists = draft.trim() && vehicles.some((v) => v.toLowerCase() === draft.trim().toLowerCase())

  return (
    <dialog ref={ref} className="modal settings" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="modal-body">
        <header className="settings-header">
          <h2 className="modal-title" style={{ margin: 0 }}>
            Settings
          </h2>
          <span className="spacer" />
          <button className="btn" onClick={() => ref.current.close()}>
            Close
          </button>
        </header>

        <section className="settings-section">
          <h3 className="settings-title">Regular vehicles</h3>
          <p className="settings-help">
            Offered as one-tap buttons when adding a vehicle strip, in this order. Shared by all boards.
          </p>

          {vehicles.length === 0 ? (
            <p className="settings-empty">No regular vehicles yet.</p>
          ) : (
            <ul className="settings-list">
              {vehicles.map((name, i) => (
                <li key={name} className="settings-row">
                  <span className="settings-row-name">{name}</span>
                  <button
                    className="btn btn-icon"
                    onClick={() => set(shiftInOrder(vehicles, name, -1))}
                    disabled={i === 0}
                    aria-label={`Move ${name} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={() => set(shiftInOrder(vehicles, name, 1))}
                    disabled={i === vehicles.length - 1}
                    aria-label={`Move ${name} down`}
                  >
                    ▼
                  </button>
                  <button
                    className="btn btn-icon btn-quiet"
                    onClick={() => set(vehicles.filter((v) => v !== name))}
                    aria-label={`Remove ${name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="settings-add" onSubmit={add}>
            <input
              ref={inputRef}
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Vehicle name, e.g. Follow-me 2"
              aria-label="New regular vehicle"
              autoComplete="off"
            />
            <button className="btn btn-primary" type="submit" disabled={!draft.trim() || exists}>
              Add
            </button>
          </form>
          {exists && <p className="settings-help">Already on the list.</p>}
        </section>
      </div>
    </dialog>
  )
}
