import { Fragment, useCallback, useRef, useState } from 'react'
import './app.css'
import BayColumn from './components/BayColumn.jsx'
import BayGap from './components/BayGap.jsx'
import BoardBar from './components/BoardBar.jsx'
import NewBayForm from './components/NewBayForm.jsx'
import StripDndContext from './components/StripDndContext.jsx'
import { useNow } from './hooks/useNow.js'
import { useSpanAlignment } from './hooks/useSpanAlignment.js'
import { SpanLayoutContext } from './state/spanLayoutContext.js'
import { useActiveBoard } from './state/storeContext.js'

export default function App() {
  const { board } = useActiveBoard()
  const now = useNow()
  const boardRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const onDraggingChange = useCallback((v) => setDragging(v), [])
  const spanLayout = useSpanAlignment(board, boardRef, { frozen: dragging })
  return (
    <div className="app">
      <BoardBar />
      <main className="board" ref={boardRef}>
        {board.bayOrder.length === 0 && <p className="board-empty">Add a bay to get started.</p>}
        <SpanLayoutContext.Provider value={spanLayout}>
          <StripDndContext onDraggingChange={onDraggingChange}>
            {board.bayOrder.map((id, i) => (
              <Fragment key={id}>
                {i > 0 && <BayGap leftBayId={board.bayOrder[i - 1]} rightBayId={id} />}
                <BayColumn bay={board.bays[id]} index={i} count={board.bayOrder.length} now={now} />
              </Fragment>
            ))}
          </StripDndContext>
        </SpanLayoutContext.Provider>
        <div className="bay bay-new">
          <NewBayForm />
        </div>
      </main>
    </div>
  )
}
