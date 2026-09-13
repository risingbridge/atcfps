import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef } from 'react'
import { formatMinutes, minutesSince } from '../lib/time.js'

const KIND_ICON = { ifr: '✈', vfr: '✈', vehicle: '⛟', info: 'ⓘ' }

/**
 * A compact token: callsign + sequence number on the first row, type ·
 * level · squawk on the second. Frame colour by intent (land yellow,
 * depart blue, circuit green) or kind (vehicle red, info amber).
 * Gestures: tap = card; fast horizontal swipe (touch) = advance / back;
 * long-press = drag (dnd-kit).
 */
export default function Token(props) {
  return props.plain ? <TokenView {...props} /> : <SortableToken {...props} />
}

function SortableToken(props) {
  const sortable = useSortable({ id: props.token.id, data: { type: 'token', placeId: props.token.placeId } })
  return <TokenView {...props} sortable={sortable} />
}

function TokenView({ token, seq, now, onOpen, onSwipe, alarm = false, sortable = null }) {
  const swipe = useRef(null)

  const listeners = sortable?.listeners ?? {}
  const onTouchStart = (e) => {
    const t = e.touches[0]
    swipe.current = { x: t.clientX, y: t.clientY, t: performance.now() }
    listeners.onTouchStart?.(e) // dnd-kit's long-press starts too; a fast flick cancels it by moving
  }
  const onTouchEnd = (e) => {
    const s = swipe.current
    swipe.current = null
    if (!s || !onSwipe) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    const dt = performance.now() - s.t
    if (dt < 350 && Math.abs(dx) > 60 && Math.abs(dy) < 40) {
      e.preventDefault()
      onSwipe(dx > 0 ? 1 : -1)
    }
  }

  const style = sortable
    ? { transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }
    : undefined
  const minutes = now != null ? minutesSince(token.lastMovedAt, now) : null
  const frame = token.kind === 'vehicle' ? 'vehicle' : token.kind === 'info' ? 'info' : token.intent

  return (
    <div
      ref={sortable?.setNodeRef}
      className={`token ${sortable?.isDragging ? 'is-lifted' : ''} ${alarm ? 'is-alarm' : ''}`}
      data-frame={frame}
      data-token-id={token.id}
      style={style}
      {...(sortable?.attributes ?? {})}
      {...listeners}
      onClick={() => onOpen?.(token)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="token-row">
        <span className="token-icon" aria-hidden="true">
          {KIND_ICON[token.kind]}
        </span>
        <span className="token-callsign">{token.callsign || '—'}</span>
        {seq != null && (
          <span className="token-seq" title="Sequence number">
            {seq}
          </span>
        )}
        {token.kind === 'vfr' && token.circuits > 0 && (
          <span className="token-circuits" title="Circuits flown">
            ↻{token.circuits}
          </span>
        )}
      </div>
      <div className="token-row token-row-2">
        {token.kind === 'vehicle' || token.kind === 'info' ? (
          <span className="token-field token-grow">{token.remarks || (token.kind === 'vehicle' ? token.permissions.join(' · ') || 'no permissions' : '')}</span>
        ) : (
          <>
            <span className="token-field">{token.type || '—'}</span>
            <span className="token-field token-level">{token.clearedLevel || '—'}</span>
            <span className="token-field">{token.squawk || '—'}</span>
            <span className="token-field token-grow" />
          </>
        )}
        {minutes != null && <span className="token-age">{formatMinutes(minutes)}</span>}
      </div>
    </div>
  )
}
