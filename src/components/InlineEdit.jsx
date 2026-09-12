import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

/**
 * Text that turns into an input on click. Enter/blur commits (non-blank
 * only), Esc cancels.
 */
export default function InlineEdit({ ref, value, onCommit, className = '', as: Tag = 'span', title }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)


  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const start = useCallback(() => {
    setDraft(value)
    setEditing(true)
  }, [value])

  useImperativeHandle(ref, () => ({ start }), [start])

  function commit() {
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`inline-edit-input ${className}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }
  return (
    <Tag className={`inline-edit ${className}`} onClick={start} title={title ?? 'Click to rename'}>
      {value}
    </Tag>
  )
}
