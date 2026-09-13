import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import { baySortId } from '../lib/dnd.js'
import { isDivider } from '../lib/stripTypes.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import Strip from './Strip.jsx'

/**
 * Two drag layers in one DndContext:
 *  - strips: multi-container sortable. Cross-bay moves are applied to the
 *    store during dragOver (so the target bay opens a gap), the final index
 *    on dragEnd. lastMovedAt is stamped only when the strip ends up in a
 *    different bay than it started in.
 *  - bays: a horizontal sortable over the bay headers (ids prefixed so they
 *    don't collide with the bays' strip-droppable ids).
 */
export default function StripDndContext({ children, onDraggingChange }) {
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
    if (data?.type === 'gap') return null
    return data?.type === 'bay' ? over.id : data?.bayId ?? null
  }

  /** Index in `bayId` for a drop at the dragged rect's top, from the DOM (used for gap drops). */
  function indexFromDom(bayId, active) {
    const list = document.querySelector(`[data-bay-strips="${CSS.escape(bayId)}"]`)
    const top = active.rect.current.translated?.top
    if (!list || top == null) return null
    return [...list.children].filter((c) => {
      if (!c.hasAttribute('data-strip-id') || c.dataset.stripId === active.id) return false
      const r = c.getBoundingClientRect()
      return top > r.top + r.height / 2
    }).length
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
    onDraggingChange?.(true)
    if (active.data.current?.type === 'baySort') return
    const strip = board.strips[active.id]
    if (!strip) return
    setActiveId(active.id)
    origin.current = { bayId: strip.currentBayId, index: board.bays[strip.currentBayId].stripOrder.indexOf(active.id) }
  }

  function onDragOver({ active, over }) {
    if (active.data.current?.type === 'baySort') return
    const strip = board.strips[active.id]
    const toBay = bayOf(over)
    if (!strip || !toBay || toBay === strip.currentBayId) return
    dispatch(actions.moveStrip(board.id, active.id, toBay, indexFor(over, toBay, active), { markMoved: false }))
  }

  function onDragEnd({ active, over }) {
    if (active.data.current?.type === 'baySort') {
      settle()
      const from = active.data.current.bayId
      const to = over?.data.current?.type === 'baySort' ? over.data.current.bayId : null
      if (to && to !== from) {
        dispatch(actions.reorderBays(board.id, arrayMove(board.bayOrder, board.bayOrder.indexOf(from), board.bayOrder.indexOf(to))))
      }
      return
    }
    const strip = board.strips[active.id]
    if (strip && over?.data.current?.type === 'gap' && !isDivider(strip)) {
      const { leftBayId } = over.data.current
      dispatch(actions.spanStrip(board.id, active.id, leftBayId, indexFromDom(leftBayId, active)))
      if (origin.current && origin.current.bayId !== leftBayId) {
        dispatch(actions.updateStrip(board.id, active.id, { lastMovedAt: new Date().toISOString() }))
      }
      finish()
      return
    }
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
    if (active.data.current?.type === 'baySort') {
      settle()
      return
    }
    if (origin.current) {
      dispatch(actions.moveStrip(board.id, active.id, origin.current.bayId, origin.current.index, { markMoved: false }))
    }
    finish()
  }

  function finish() {
    setActiveId(null)
    origin.current = null
    settle()
  }

  // dnd-kit clears its transforms in its own render after ours; report
  // "not dragging" after that so layout measurement sees the settled DOM.
  function settle() {
    setTimeout(() => onDraggingChange?.(false), 0)
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
      <SortableContext items={board.bayOrder.map(baySortId)} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
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
  const isBaySort = (c) => c.data?.current?.type === 'baySort'
  if (args.active.data.current?.type === 'baySort') {
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(isBaySort) })
  }
  args = { ...args, droppableContainers: args.droppableContainers.filter((c) => !isBaySort(c)) }
  const within = pointerWithin(args)
  const hits = within.length ? within : rectIntersection(args)
  const gap = within.find((h) => h.data?.droppableContainer?.data?.current?.type === 'gap')
  if (gap) return [gap]
  const strip = hits.find((h) => h.data?.droppableContainer?.data?.current?.type === 'strip')
  if (strip) return [strip]
  const bay = hits.find((h) => h.data?.droppableContainer?.data?.current?.type === 'bay')
  if (bay) return [bay]
  return closestCorners(args)
}
