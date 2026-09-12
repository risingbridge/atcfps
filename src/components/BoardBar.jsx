import { useDialogs } from '../hooks/useDialogs.js'
import { actions } from '../state/store.js'
import { useStore } from '../state/storeContext.js'
import BoardMenu from './BoardMenu.jsx'
import InlineEdit from './InlineEdit.jsx'
import WakeLockToggle from './WakeLockToggle.jsx'

export default function BoardBar() {
  const { state, dispatch } = useStore()
  const board = state.boards[state.activeBoardId]
  const { prompt } = useDialogs()

  async function newBoard() {
    const name = await prompt('New board', `Board ${state.boardOrder.length + 1}`, { confirmLabel: 'Create' })
    if (name == null) return
    dispatch(actions.createBoard(name))
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
        <BoardMenu />
      </div>
      <div className="board-bar-tools">
        <WakeLockToggle />
      </div>
    </header>
  )
}
