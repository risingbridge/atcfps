import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Token from './Token.jsx'

/** One place on the board: a droppable, sortable list of tokens. */
export default function Cell({ place, tokens, seqById, now, onOpen, onSwipe, alarmIds, className = '', arrow }) {
  const { setNodeRef, isOver } = useDroppable({ id: place.id, data: { type: 'place', placeId: place.id } })
  return (
    <section className={`cell cell-${place.kind} ${className} ${isOver ? 'is-over' : ''}`} data-place={place.id}>
      <header className="cell-head">
        <span className="cell-name">{place.name}</span>
        {tokens.length > 0 && <span className="cell-count">{tokens.length}</span>}
        {arrow && <span className="cell-arrow" aria-hidden="true">{arrow}</span>}
      </header>
      <SortableContext id={place.id} items={tokens.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="cell-list">
          {tokens.map((t) => (
            <Token key={t.id} token={t} seq={seqById?.[t.id]} now={now} onOpen={onOpen} onSwipe={(d) => onSwipe?.(t, d)} alarm={alarmIds?.has(t.id)} />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
