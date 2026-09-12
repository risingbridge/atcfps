import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Strip from './Strip.jsx'

/** A Strip wired into its bay's SortableContext. */
export default function SortableStrip({ strip, bayId, ...rest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: strip.id,
    data: { type: 'strip', bayId },
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }
  return (
    <Strip
      strip={strip}
      innerRef={setNodeRef}
      style={style}
      className={isDragging ? 'strip-placeholder' : ''}
      dragProps={{ ...attributes, ...listeners }}
      {...rest}
    />
  )
}
