import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCorners, pointerWithin, rectIntersection, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { actions, tokensIn } from '../model/store.js'
import { useStore } from '../state/storeContext.js'
import Token from './Token.jsx'

/**
 * Tokens move between places by drag. Cross-place moves apply on dragOver
 * so the target opens a gap; the final index applies on dragEnd, recorded
 * as one 'move' event (the reducer only logs when something changes).
 */
export default function FlowDndContext({ children }) {
  const { state, dispatch } = useStore()
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const placeOf = (over) => (over ? (over.data.current?.type === 'place' ? over.id : over.data.current?.placeId) : null)

  function indexFor(over, placeId, active) {
    const order = tokensIn(state, placeId).map((t) => t.id)
    if (over.data.current?.type !== 'token') return order.length
    const i = order.indexOf(over.id)
    if (i < 0) return order.length
    const rect = active.rect.current.translated
    const below = rect && rect.top > over.rect.top + over.rect.height / 2
    return i + (below ? 1 : 0)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragOver={({ active, over }) => {
        const token = state.tokens[active.id]
        const to = placeOf(over)
        if (!token || !to || to === token.placeId) return
        dispatch(actions.moveToken(active.id, to, indexFor(over, to, active)))
      }}
      onDragEnd={({ active, over }) => {
        const token = state.tokens[active.id]
        const to = placeOf(over)
        if (token && to) {
          const index = over.data.current?.type === 'token' && to === token.placeId ? tokensIn(state, to).findIndex((t) => t.id === over.id) : indexFor(over, to, active)
          dispatch(actions.moveToken(active.id, to, index))
        }
        setActiveId(null)
      }}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeId && state.tokens[activeId] ? <Token token={state.tokens[activeId]} plain /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function collision(args) {
  const within = pointerWithin(args)
  const hits = within.length ? within : rectIntersection(args)
  const token = hits.find((h) => h.data?.droppableContainer?.data?.current?.type === 'token')
  if (token) return [token]
  const place = hits.find((h) => h.data?.droppableContainer?.data?.current?.type === 'place')
  if (place) return [place]
  return closestCorners(args)
}
