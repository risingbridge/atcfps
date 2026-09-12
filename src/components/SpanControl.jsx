/**
 * "Also in" selector for a strip's editor: None, or one of the strip's
 * neighbouring bays. `options` = { left: {id,name}|null, right: {id,name}|null }.
 */
export default function SpanControl({ value, options, onChange }) {
  const choices = [options.left, options.right].filter(Boolean)
  return (
    <label className="field">
      <span className="field-label">Also in</span>
      <select
        className="board-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={choices.length === 0}
        title={choices.length ? undefined : 'No neighbouring bay'}
      >
        <option value="">None</option>
        {options.left && <option value={options.left.id}>{options.left.name} (left)</option>}
        {options.right && <option value={options.right.id}>{options.right.name} (right)</option>}
      </select>
    </label>
  )
}
