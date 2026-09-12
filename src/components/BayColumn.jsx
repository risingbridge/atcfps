import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useState } from 'react'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo.js'
import { actions, shiftInOrder } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import InlineEdit from './InlineEdit.jsx'
import NewStripMenu from './NewStripMenu.jsx'
import SortableStrip from './SortableStrip.jsx'
import StripEditor from './StripEditor.jsx'

export default function BayColumn({ bay, index, count, now }) {
  const { board, dispatch } = useActiveBoard()
  const { setNodeRef, isOver } = useDroppable({ id: bay.id, data: { type: 'bay' } })
  const { deleteStrip, deleteBay } = useDeleteWithUndo()
  const [editingId, setEditingId] = useState(null)
  const closeEditor = useCallback(() => setEditingId(null), [])

  function move(delta) {
    dispatch(actions.reorderBays(board.id, shiftInOrder(board.bayOrder, bay.id, delta)))
  }

  return (
    <section className="bay" style={bay.color ? { '--bay-accent': bay.color } : undefined}>
      <header className="bay-header">
        <InlineEdit
          as="h2"
          className="bay-name"
          value={bay.name}
          onCommit={(name) => dispatch(actions.renameBay(board.id, bay.id, name))}
        />
        <span className="bay-count">{bay.stripOrder.length}</span>
        <div className="bay-tools">
          <button className="btn btn-icon" onClick={() => move(-1)} disabled={index === 0} aria-label="Move bay left">
            ◀
          </button>
          <button className="btn btn-icon" onClick={() => move(1)} disabled={index === count - 1} aria-label="Move bay right">
            ▶
          </button>
          <button className="btn btn-icon btn-quiet" onClick={() => deleteBay(bay.id)} aria-label="Delete bay">
            ✕
          </button>
        </div>
      </header>
      <SortableContext id={bay.id} items={bay.stripOrder} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`bay-strips ${isOver ? 'is-over' : ''}`}>
          {bay.stripOrder.map((id) => (
            <SortableStrip
              key={id}
              strip={board.strips[id]}
              now={now}
              bayId={bay.id}
              onClick={() => setEditingId(id)}
              onDelete={() => deleteStrip(id)}
            />
          ))}
        </div>
      </SortableContext>
      <footer className="bay-footer">
        <NewStripMenu bayId={bay.id} />
      </footer>
      {editingId && board.strips[editingId] && (
        <StripEditor strip={board.strips[editingId]} onClose={closeEditor} />
      )}
    </section>
  )
}
