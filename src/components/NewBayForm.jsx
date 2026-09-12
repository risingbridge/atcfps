import { useState } from 'react'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'

export default function NewBayForm() {
  const { board, dispatch } = useActiveBoard()
  const [name, setName] = useState('')

  function submit(e) {
    e.preventDefault()
    dispatch(actions.addBay(board.id, name))
    setName('')
  }

  return (
    <form className="new-bay" onSubmit={submit}>
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Bay ${board.bayOrder.length + 1}`}
        aria-label="New bay name"
      />
      <button className="btn" type="submit">
        + Add bay
      </button>
    </form>
  )
}
