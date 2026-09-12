import { actions } from '../state/store.js'
import { useStore } from '../state/storeContext.js'
import InlineEdit from './InlineEdit.jsx'

export default function BoardBar() {
  const { state, dispatch } = useStore()
  const board = state.boards[state.activeBoardId]

  function newBoard() {
    const name = window.prompt('Board name', `Board ${state.boardOrder.length + 1}`)
    if (name == null) return
    dispatch(actions.createBoard(name))
  }
  function deleteBoard() {
    const count = Object.keys(board.strips).length
    const msg = `Delete board "${board.name}"${count ? ` and its ${count} strips` : ''}?`
    if (window.confirm(msg)) dispatch(actions.deleteBoard(board.id))
  }

  return (
    <header className="board-bar">
      <span className="board-bar-brand">STRIP BOARD</span>
      <div className="board-bar-boards">
        <select
          className="board-select"
          value={state.activeBoardId}
          onChange={(e) => dispatch(actions.setActiveBoard(e.target.value))}
          aria-label="Active board"
        >
          {state.boardOrder.map((id) => (
            <option key={id} value={id}>
              {state.boards[id].name}
            </option>
          ))}
        </select>
        <InlineEdit
          value={board.name}
          onCommit={(name) => dispatch(actions.renameBoard(board.id, name))}
          className="board-name"
          title="Click to rename board"
        />
        <button className="btn" onClick={newBoard}>
          + New board
        </button>
        <button className="btn btn-quiet" onClick={deleteBoard} title="Delete this board">
          Delete
        </button>
      </div>
      <div className="board-bar-tools">{/* wake-lock toggle lands here in Phase 3 */}</div>
    </header>
  )
}
