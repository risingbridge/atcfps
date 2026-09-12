import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ALT_COMMON, FL_COMMON, formatLevel, parseLevel, stepLevel } from '../lib/levels.js'

const WIDTH = 360

/**
 * Popover for setting a strip's cleared level. Anchored to `anchor` (a
 * DOMRect); every change calls onChange(value) immediately.
 */
export default function LevelPicker({ value, anchor, onChange, onClose }) {
  const ref = useRef(null)
  const parsed = parseLevel(value)
  const [mode, setMode] = useState(parsed?.mode ?? 'FL')
  const [pos, setPos] = useState({ left: 0, top: 0 })

  // top layer so it sits above everything, positioned next to the cell
  useLayoutEffect(() => {
    const el = ref.current
    try {
      el.showPopover?.()
    } catch {
      /* already open */
    }
    const h = el.offsetHeight
    const margin = 8
    let left = Math.min(anchor.right - WIDTH, window.innerWidth - WIDTH - margin)
    left = Math.max(margin, left)
    let top = anchor.bottom + 6
    if (top + h > window.innerHeight - margin) top = Math.max(margin, anchor.top - h - 6)
    setPos({ left, top })
  }, [anchor])

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const list = mode === 'FL' ? FL_COMMON : ALT_COMMON
  const current = parsed && parsed.mode === mode ? parsed.hundreds : null

  function switchMode(next) {
    setMode(next)
    if (parsed && parsed.mode !== next) onChange(formatLevel(next, parsed.hundreds))
  }

  return (
    <div
      ref={ref}
      className="level-picker"
      popover="manual"
      role="dialog"
      aria-label="Cleared level"
      style={{ left: pos.left, top: pos.top, width: WIDTH }}
    >
      <div className="level-picker-head">
        <div className="segmented segmented-sm" role="radiogroup" aria-label="Level type">
          {['FL', 'ALT'].map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={`segment ${mode === m ? 'is-selected' : ''}`}
              onClick={() => switchMode(m)}
            >
              {m === 'FL' ? 'Flight level' : 'Altitude'}
            </button>
          ))}
        </div>
        <output className="level-picker-value" aria-live="polite">
          {value || '—'}
        </output>
      </div>

      <div className="level-picker-steps">
        <button type="button" className="btn btn-step" onClick={() => onChange(stepLevel(value, -10, mode))}>
          −10
        </button>
        {mode === 'ALT' && (
          <>
            <button type="button" className="btn btn-step" onClick={() => onChange(stepLevel(value, -5, mode))}>
              −5
            </button>
            <button type="button" className="btn btn-step" onClick={() => onChange(stepLevel(value, 5, mode))}>
              +5
            </button>
          </>
        )}
        <button type="button" className="btn btn-step" onClick={() => onChange(stepLevel(value, 10, mode))}>
          +10
        </button>
      </div>

      <div className="level-picker-grid">
        {list.map((h) => (
          <button
            key={h}
            type="button"
            className={`btn btn-level ${current === h ? 'is-selected' : ''}`}
            onClick={() => onChange(formatLevel(mode, h))}
          >
            {formatLevel(mode, h)}
          </button>
        ))}
      </div>

      <div className="level-picker-foot">
        <button type="button" className="btn btn-quiet" onClick={() => onChange('')} disabled={!value}>
          Clear
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
