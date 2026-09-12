import { actions } from '../state/store.js'
import { useStore } from '../state/storeContext.js'
import BoardMenu from './BoardMenu.jsx'
import WakeLockToggle from './WakeLockToggle.jsx'

export default function BoardBar() {
  const { state, dispatch } = useStore()
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
        <BoardMenu />
      </div>
      <div className="board-bar-tools">
        <WakeLockToggle />
      </div>
    </header>
  )
}
