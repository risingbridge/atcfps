import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useRef, useState } from 'react'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import BayMenu from './BayMenu.jsx'
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
  const nameRef = useRef(null)

  return (
    <section className="bay" style={bay.color ? { '--bay-accent': bay.color } : undefined}>
      <header className="bay-header">
        <InlineEdit
          ref={nameRef}
          as="h2"
          className="bay-name"
          value={bay.name}
          onCommit={(name) => dispatch(actions.renameBay(board.id, bay.id, name))}
        />
        <span className="bay-count">{bay.stripOrder.length}</span>
        <div className="bay-tools">
          <BayMenu
            bay={bay}
            index={index}
            count={count}
            onDelete={() => deleteBay(bay.id)}
            onRename={() => nameRef.current?.start()}
          />
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
