import { HIGHLIGHT_COLORS } from '../lib/colors.js'

/** Row of highlight swatches plus "none". `value` is a hex string or empty. */
export default function ColorPicker({ value, onChange, label = 'Highlight' }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          className={`swatch swatch-none ${!value ? 'is-selected' : ''}`}
          onClick={() => onChange('')}
          title="None"
        >
          ✕
        </button>
        {HIGHLIGHT_COLORS.map(([hex, name]) => (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={value === hex}
            className={`swatch ${value === hex ? 'is-selected' : ''}`}
            style={{ '--swatch': hex }}
            onClick={() => onChange(hex)}
            title={name}
          />
        ))}
      </div>
    </div>
  )
}
