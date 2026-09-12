import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { actions, shiftInOrder } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import InlineEdit from './InlineEdit.jsx'
import NewStripMenu from './NewStripMenu.jsx'
import SortableStrip from './SortableStrip.jsx'

export default function BayColumn({ bay, index, count }) {
  const { board, dispatch } = useActiveBoard()
  const { setNodeRef, isOver } = useDroppable({ id: bay.id, data: { type: 'bay' } })

  function move(delta) {
    dispatch(actions.reorderBays(board.id, shiftInOrder(board.bayOrder, bay.id, delta)))
  }
  function remove() {
    const n = bay.stripOrder.length
    if (n && !window.confirm(`Delete bay "${bay.name}" and its ${n} strip${n === 1 ? '' : 's'}?`)) return
    dispatch(actions.deleteBay(board.id, bay.id))
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
          <button className="btn btn-icon btn-quiet" onClick={remove} aria-label="Delete bay">
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
              bayId={bay.id}
              onDelete={() => dispatch(actions.deleteStrip(board.id, id))}
            />
          ))}
        </div>
      </SortableContext>
      <footer className="bay-footer">
        <NewStripMenu bayId={bay.id} />
      </footer>
    </section>
  )
}
