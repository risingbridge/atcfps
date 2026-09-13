import { useRef, useState } from 'react'
import { shiftInOrder } from '../state/store.js'

/**
 * Editable, ordered list of presets ({ label, notes }) for one quick-strip
 * type. `onChange(list)` receives the whole list after any edit.
 */
export default function PresetList({ presets, onChange, labelName, autoFocus }) {
  const [draft, setDraft] = useState({ label: '', notes: '' })
  const [editing, setEditing] = useState(null) // label of the row being edited
  const [edit, setEdit] = useState({ label: '', notes: '' })
  const labelRef = useRef(null)

  const labels = presets.map((p) => p.label)
  const taken = (label, except) =>
    presets.some((p) => p.label !== except && p.label.toLowerCase() === label.trim().toLowerCase())

  function add(e) {
    e.preventDefault()
    const label = draft.label.trim()
    if (!label || taken(label)) return
    onChange([...presets, { label, notes: draft.notes.trim() }])
    setDraft({ label: '', notes: '' })
    labelRef.current?.focus()
  }

  function startEdit(p) {
    setEditing(p.label)
    setEdit({ label: p.label, notes: p.notes })
  }

  function saveEdit(e) {
    e.preventDefault()
    const label = edit.label.trim()
    if (!label || taken(label, editing)) return
    onChange(presets.map((p) => (p.label === editing ? { label, notes: edit.notes.trim() } : p)))
    setEditing(null)
  }

  const draftTaken = draft.label.trim() && taken(draft.label)

  return (
    <>
      {presets.length === 0 ? (
        <p className="settings-empty">None yet.</p>
      ) : (
        <ul className="settings-list">
          {presets.map((p, i) => (
            <li key={p.label} className={`settings-row ${editing === p.label ? 'is-editing' : ''}`}>
              {editing === p.label ? (
                <form className="settings-edit" onSubmit={saveEdit}>
                  <input
                    className="input"
                    value={edit.label}
                    onChange={(e) => setEdit({ ...edit, label: e.target.value })}
                    aria-label={labelName}
                    autoFocus
                  />
                  <input
                    className="input"
                    value={edit.notes}
                    onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                    placeholder="Note (optional)"
                    aria-label="Note"
                  />
                  <div className="settings-edit-actions">
                    <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!edit.label.trim() || taken(edit.label, editing)}>
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="settings-row-text">
                    <span className="settings-row-name">{p.label}</span>
                    {p.notes && <span className="settings-row-note">{p.notes}</span>}
                  </div>
                  <button className="btn btn-icon btn-quiet" onClick={() => startEdit(p)} aria-label={`Edit ${p.label}`} title="Edit">
                    ✎
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={() => onChange(reorder(presets, shiftInOrder(labels, p.label, -1)))}
                    disabled={i === 0}
                    aria-label={`Move ${p.label} up`}
                  >
                    ▲
                  </button>
                  <button
                    className="btn btn-icon"
                    onClick={() => onChange(reorder(presets, shiftInOrder(labels, p.label, 1)))}
                    disabled={i === presets.length - 1}
                    aria-label={`Move ${p.label} down`}
                  >
                    ▼
                  </button>
                  <button
                    className="btn btn-icon btn-quiet"
                    onClick={() => onChange(presets.filter((q) => q.label !== p.label))}
                    aria-label={`Remove ${p.label}`}
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="settings-add" onSubmit={add}>
        <input
          ref={labelRef}
          className="input"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder={labelName}
          aria-label={`New ${labelName.toLowerCase()}`}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        <input
          className="input"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Note (optional)"
          aria-label="Note"
          autoComplete="off"
        />
        <button className="btn btn-primary" type="submit" disabled={!draft.label.trim() || draftTaken}>
          Add
        </button>
      </form>
      {draftTaken && <p className="settings-help">Already on the list.</p>}
    </>
  )
}

function reorder(presets, labelOrder) {
  const byLabel = Object.fromEntries(presets.map((p) => [p.label, p]))
  return labelOrder.map((l) => byLabel[l])
}
