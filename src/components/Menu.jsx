import { useEffect, useId, useRef, useState } from 'react'

/**
 * Small popover menu. `items` is an array of { label, onSelect, danger,
 * disabled } or 'separator', or a React node for custom rows.
 */
export default function Menu({ label, icon = '⋯', items, align = 'left', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`menu ${className}`} ref={ref}>
      <button
        className="btn btn-icon"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
      </button>
      {open && (
        <div className={`menu-popover menu-${align}`} role="menu" id={id}>
          {items.map((item, i) =>
            item === 'separator' ? (
              <hr key={i} className="menu-sep" />
            ) : item.label ? (
              <button
                key={i}
                role="menuitem"
                className={`menu-item ${item.danger ? 'is-danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            ) : (
              <div key={i} className="menu-row" onClick={(e) => e.stopPropagation()}>
                {item.node}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
