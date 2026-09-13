/**
 * A purpose-built keypad for callsigns, types, squawks and levels: large
 * uppercase alphanumerics, no autocorrect, one layer. Replaces the iOS
 * keyboard for the 95% case and never hides half the board.
 */
const ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM-/']

export default function Keypad({ value, onChange, onDone, doneLabel = 'Done', disabled = false }) {
  const type = (ch) => onChange(value + ch)
  return (
    <div className="keypad" role="group" aria-label="Keypad">
      {ROWS.map((row) => (
        <div key={row} className="keypad-row">
          {row.split('').map((ch) => (
            <button key={ch} type="button" className="key" onClick={() => type(ch)} disabled={disabled}>
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="keypad-row">
        <button type="button" className="key key-wide" onClick={() => type(' ')} disabled={disabled}>
          space
        </button>
        <button type="button" className="key key-wide" onClick={() => onChange(value.slice(0, -1))} disabled={disabled || !value} aria-label="Backspace">
          ⌫
        </button>
        <button type="button" className="key key-wide key-primary" onClick={onDone} disabled={disabled}>
          {doneLabel}
        </button>
      </div>
    </div>
  )
}
