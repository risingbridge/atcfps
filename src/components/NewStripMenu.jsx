import { useCallback, useEffect, useRef, useState } from 'react'
import { STRIP_TYPES, STRIP_TYPE_ORDER } from '../lib/stripTypes.js'
import { actions } from '../state/store.js'
import { useActiveBoard, useStore } from '../state/storeContext.js'
import FlightStripModal from './FlightStripModal.jsx'

/** Type picker at the foot of a bay: quick-add input for info/vehicle, modal for flight. */
export default function NewStripMenu({ bayId }) {
  const { board, dispatch } = useActiveBoard()
  const { state } = useStore()
  const [mode, setMode] = useState(null) // null | strip type key
  const presets = mode ? (state.settings.presets?.[mode] ?? []) : []
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (mode && STRIP_TYPES[mode].quickAdd) inputRef.current?.focus()
  }, [mode])

  const close = useCallback(() => setMode(null), [])

  function quickSubmit(e) {
    e.preventDefault()
    if (!value.trim()) return
    dispatch(actions.createQuickStrip(board.id, bayId, mode, value))
    setValue('') // stay open for the next one
  }

  if (mode && STRIP_TYPES[mode].quickAdd) {
    const def = STRIP_TYPES[mode]
    return (
      <form className="quick-add" onSubmit={quickSubmit} data-type={mode}>
        {presets.length > 0 && (
          <div className="quick-chips" role="group" aria-label={`Regular ${def.label.toLowerCase()} strips`}>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn btn-chip"
                data-type={mode}
                title={p.notes || undefined}
                onPointerDown={(e) => e.preventDefault()} /* keep the input focused so its blur doesn't close us */
                onClick={() => dispatch(actions.createPresetStrip(board.id, bayId, mode, p))}
              >
                {p.label}
                {p.notes && <span className="chip-note" aria-label="has a note">·</span>}
              </button>
            ))}
          </div>
        )}
        <span className="quick-add-icon">{def.icon}</span>
        <input
          ref={inputRef}
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          onBlur={() => !value && close()}
          placeholder={def.quickLabel}
          aria-label={def.quickLabel}
        />
        <button type="button" className="btn btn-quiet" onClick={close} aria-label="Cancel">
          ✕
        </button>
      </form>
    )
  }

  return (
    <div className="new-strip">
      {STRIP_TYPE_ORDER.map((key) => {
        const def = STRIP_TYPES[key]
        return (
          <button key={key} className="btn btn-type" data-type={key} onClick={() => setMode(key)}>
            <span className="type-icon">{def.icon}</span> {def.label}
          </button>
        )
      })}
      {mode === 'flight' && (
        <FlightStripModal
          onClose={close}
          onSubmit={(fields) => dispatch(actions.createFlightStrip(board.id, bayId, fields))}
        />
      )}
    </div>
  )
}
