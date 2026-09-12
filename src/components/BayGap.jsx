import { useDndContext, useDroppable } from '@dnd-kit/core'
import { gapId } from '../lib/dnd.js'

/**
 * Drop zone between two adjacent bays. The node is 48px wide (overlapping
 * 18px into each neighbour) so it's a real touch target for dnd-kit's
 * rect-based collision detection, but it only paints the 12px gutter and
 * never intercepts pointer events.
 */
export default function BayGap({ leftBayId, rightBayId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: gapId(leftBayId),
    data: { type: 'gap', leftBayId, rightBayId },
  })
  const { active } = useDndContext()
  const armed = active?.data.current?.type === 'strip'
  return (
    <div ref={setNodeRef} className={`bay-gap ${armed ? 'is-armed' : ''} ${isOver ? 'is-over' : ''}`} aria-hidden="true">
      <div className="bay-gap-line" />
    </div>
  )
}
