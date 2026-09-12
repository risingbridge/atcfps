import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import Strip from './Strip.jsx'

/**
 * Multi-container sortable: cross-bay moves are applied to the store during
 * dragOver (so the target bay opens a gap), the final index on dragEnd.
 * lastMovedAt is stamped only when the strip ends up in a different bay
 * than it started in.
 */
export default function StripDndContext({ children }) {
  const { board, dispatch } = useActiveBoard()
  const [activeId, setActiveId] = useState(null)
  const origin = useRef(null) // { bayId, index } at drag start

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function bayOf(over) {
    if (!over) return null
    const data = over.data.current
    return data?.type === 'bay' ? over.id : data?.bayId ?? null
  }

  /** Index in `bayId` for a drop described by `over`, using pointer position for strips. */
  function indexFor(over, bayId, active) {
    const order = board.bays[bayId]?.stripOrder ?? []
    if (over.data.current?.type !== 'strip') return order.length
    const overIndex = order.indexOf(over.id)
    if (overIndex < 0) return order.length
    const rect = active.rect.current.translated
    const below = rect && rect.top > over.rect.top + over.rect.height / 2
    return overIndex + (below ? 1 : 0)
  }

  function onDragStart({ active }) {
    const strip = board.strips[active.id]
    if (!strip) return
    setActiveId(active.id)
    origin.current = { bayId: strip.currentBayId, index: board.bays[strip.currentBayId].stripOrder.indexOf(active.id) }
  }

  function onDragOver({ active, over }) {
    const strip = board.strips[active.id]
    const toBay = bayOf(over)
    if (!strip || !toBay || toBay === strip.currentBayId) return
    dispatch(actions.moveStrip(board.id, active.id, toBay, indexFor(over, toBay, active), { markMoved: false }))
  }

  function onDragEnd({ active, over }) {
    const strip = board.strips[active.id]
    const toBay = bayOf(over)
    if (strip && toBay) {
      let index
      if (over.data.current?.type === 'strip' && toBay === strip.currentBayId) {
        // same-bay sort: land exactly where dnd-kit showed the gap
        index = board.bays[toBay].stripOrder.indexOf(over.id)
      } else {
        index = indexFor(over, toBay, active)
      }
      dispatch(actions.moveStrip(board.id, active.id, toBay, index, { markMoved: false }))
      if (origin.current && origin.current.bayId !== toBay) {
        dispatch(actions.updateStrip(board.id, active.id, { lastMovedAt: new Date().toISOString() }))
      }
    }
    finish()
  }

  function onDragCancel({ active }) {
    if (origin.current) {
      dispatch(actions.moveStrip(board.id, active.id, origin.current.bayId, origin.current.index, { markMoved: false }))
    }
    finish()
  }

  function finish() {
    setActiveId(null)
    origin.current = null
  }

  const activeStrip = activeId ? board.strips[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeStrip ? <Strip strip={activeStrip} className="strip-overlay" /> : null}
      </DragOverlay>
    </DndContext>
  )
}

/**
 * Prefer whatever the pointer is actually over (a strip, else its bay);
 * fall back to rect intersection, then closest corners so a drop is always
 * resolved even when the pointer leaves every droppable.
 */
function collisionDetection(args) {
  const within = pointerWithin(args)
  const hits = within.length ? within : rectIntersection(args)
  const strip = hits.find((h) => h.data?.droppableContainer?.data?.current?.type === 'strip')
  if (strip) return [strip]
  const bay = hits.find((h) => h.data?.droppableContainer?.data?.current?.type === 'bay')
  if (bay) return [bay]
  return closestCorners(args)
}
