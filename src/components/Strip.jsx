import { STRIP_TYPES } from '../lib/stripTypes.js'
import { ageClass, formatMinutes, formatZulu, minutesSince } from '../lib/time.js'

function FlightBody({ strip }) {
  return (
    <>
      <div className="strip-cells">
        <span className="cell cell-callsign">{strip.callsign}</span>
        <span className="cell cell-actype">{strip.aircraftType}</span>
        <span className="cell cell-route">{strip.route}</span>
        <span className="cell cell-levels" title="Requested / cleared level">
          <span className="level-req">{strip.requestedAltitude}</span>
          <span className="level-clr">{strip.clearedAltitude}</span>
        </span>
        <span className="cell cell-squawk">{strip.squawk}</span>
      </div>
      {strip.remarks && <div className="strip-remarks">{strip.remarks}</div>}
    </>
  )
}

function QuickBody({ strip, def }) {
  return (
    <>
      <div className="strip-cells">
        {def.key === 'info' && <span className="cell cell-time">{formatZulu(strip.createdAt)}</span>}
        <span className={`cell cell-grow ${def.key === 'vehicle' ? 'cell-callsign' : 'cell-text'}`}>
          {strip[def.quickField]}
        </span>
      </div>
      {strip.notes && <div className="strip-remarks">{strip.notes}</div>}
    </>
  )
}

export default function Strip({ strip, now, onClick, onDelete, innerRef, style, className = '', dragProps }) {
  const def = STRIP_TYPES[strip.type]
  const merged = strip.colorOverride ? { ...style, '--strip-accent': strip.colorOverride } : style
  const minutes = now != null ? minutesSince(strip.lastMovedAt, now) : null
  return (
    <div
      ref={innerRef}
      className={`strip ${className} ${minutes != null ? ageClass(minutes) : ''}`}
      data-type={strip.type}
      style={merged}
      onClick={onClick}
      {...dragProps}
    >
      <span className="strip-icon" aria-label={def.label} title={def.label}>
        {def.icon}
      </span>
      <div className="strip-body">
        {strip.type === 'flight' ? <FlightBody strip={strip} /> : <QuickBody strip={strip} def={def} />}
      </div>
      {minutes != null && (
        <span className="strip-age" title={`${formatMinutes(minutes)} in this bay`}>
          {formatMinutes(minutes)}
        </span>
      )}
      {onDelete && (
        <button
          className="strip-delete"
          aria-label="Delete strip"
          title="Delete strip"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
