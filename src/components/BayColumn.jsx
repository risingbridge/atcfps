import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Fragment, useCallback, useRef, useState } from 'react'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo.js'
import { useSpanLayout } from '../state/spanLayoutContext.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import BayMenu from './BayMenu.jsx'
import { baySortId } from '../lib/dnd.js'
import InlineEdit from './InlineEdit.jsx'
import LevelPicker from './LevelPicker.jsx'
import NewStripMenu from './NewStripMenu.jsx'
import SortableStrip from './SortableStrip.jsx'
import StripEditor from './StripEditor.jsx'

export default function BayColumn({ bay, index, count, now }) {
  const { board, dispatch } = useActiveBoard()
  const { setNodeRef, isOver } = useDroppable({ id: bay.id, data: { type: 'bay' } })
  const {
    setNodeRef: setBayRef,
    setActivatorNodeRef,
    attributes: bayAttributes,
    listeners: bayListeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: baySortId(bay.id), data: { type: 'baySort', bayId: bay.id } })
  const sortStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(bay.color ? { '--bay-accent': bay.color } : {}),
  }
  const { deleteBay } = useDeleteWithUndo()
  const spanLayout = useSpanLayout()
  // strips from the bay on the left that span into this one → placeholders
  const placeholders = Object.values(board.strips)
    .filter((s) => s.spanBayId === bay.id)
    .map((s) => ({ stripId: s.id, ...(spanLayout[s.id] ?? { index: 0, height: 0, stripMargin: 0, placeholderMargin: 0 }) }))
  const [editingId, setEditingId] = useState(null)
  const closeEditor = useCallback(() => setEditingId(null), [])
  const [levelEdit, setLevelEdit] = useState(null) // { stripId, anchor }
  const closeLevel = useCallback(() => setLevelEdit(null), [])
  const nameRef = useRef(null)

  return (
    <section ref={setBayRef} className={`bay ${isDragging ? 'is-dragging' : ''}`} style={sortStyle}>
      <header
        className="bay-header"
        ref={setActivatorNodeRef}
        {...bayAttributes}
        {...bayListeners}
        title="Drag to reorder bays"
      >
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
        <div ref={setNodeRef} className={`bay-strips ${isOver ? 'is-over' : ''}`} data-bay-strips={bay.id}>
          {bay.stripOrder.map((id, i) => (
            <Fragment key={id}>
              {placeholders
                .filter((p) => p.index === i)
                .map((p) => (
                  <SpanPlaceholder key={p.stripId} {...p} />
                ))}
              <SortableStrip
                strip={board.strips[id]}
                now={now}
                bayId={bay.id}
                spanMargin={spanLayout[id]?.stripMargin}
                onClick={() => setEditingId(id)}
                onEditLevel={(anchor) => setLevelEdit({ stripId: id, anchor })}
              />
            </Fragment>
          ))}
          {placeholders
            .filter((p) => p.index >= bay.stripOrder.length)
            .map((p) => (
              <SpanPlaceholder key={p.stripId} {...p} />
            ))}
        </div>
      </SortableContext>
      <footer className="bay-footer">
        <NewStripMenu bayId={bay.id} />
      </footer>
      {editingId && board.strips[editingId] && (
        <StripEditor strip={board.strips[editingId]} onClose={closeEditor} />
      )}
      {levelEdit && board.strips[levelEdit.stripId] && (
        <LevelPicker
          value={board.strips[levelEdit.stripId].clearedAltitude}
          anchor={levelEdit.anchor}
          onChange={(clearedAltitude) => dispatch(actions.updateStrip(board.id, levelEdit.stripId, { clearedAltitude }))}
          onClose={closeLevel}
        />
      )}
    </section>
  )
}

/** Space held in the right-hand bay by a strip spanning in from the left. */
function SpanPlaceholder({ stripId, height, placeholderMargin }) {
  return (
    <div
      className="strip-span-placeholder"
      data-span-of={stripId}
      style={{ height: height || undefined, marginTop: placeholderMargin || undefined }}
      aria-hidden="true"
    />
  )
}
