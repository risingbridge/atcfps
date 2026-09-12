import './app.css'
import BayColumn from './components/BayColumn.jsx'
import BoardBar from './components/BoardBar.jsx'
import NewBayForm from './components/NewBayForm.jsx'
import { useActiveBoard } from './state/storeContext.js'

export default function App() {
  const { board } = useActiveBoard()
  return (
    <div className="app">
      <BoardBar />
      <main className="board">
        {board.bayOrder.length === 0 && <p className="board-empty">Add a bay to get started.</p>}
        {board.bayOrder.map((id, i) => (
          <BayColumn key={id} bay={board.bays[id]} index={i} count={board.bayOrder.length} />
        ))}
        <div className="bay bay-new">
          <NewBayForm />
        </div>
      </main>
    </div>
  )
}
