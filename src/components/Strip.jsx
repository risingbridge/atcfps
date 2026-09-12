import { FLIGHT_KIND_META, STRIP_TYPES, normalizeFlightKind } from '../lib/stripTypes.js'
import { ageClass, formatMinutes, formatZulu, minutesSince } from '../lib/time.js'

function AgeCell({ minutes }) {
  if (minutes == null) return null
  return (
    <span className="cell cell-age" title={`${formatMinutes(minutes)} in this bay`}>
      {formatMinutes(minutes)}
    </span>
  )
}

function FlightBody({ strip, minutes }) {
  return (
    <>
      <div className="strip-cells strip-row">
        <span className="cell cell-callsign">{strip.callsign}</span>
        <span className="cell cell-actype">{strip.aircraftType}</span>
        <span className="cell cell-squawk cell-end">{strip.squawk}</span>
      </div>
      <div className="strip-cells strip-row strip-row-2">
        <span className="cell cell-route">{strip.route}</span>
        <span className="cell cell-levels cell-end" title="Requested → cleared level">
          {strip.requestedAltitude && <span className="level-req">{strip.requestedAltitude}</span>}
          {strip.requestedAltitude && strip.clearedAltitude && <span className="level-arrow">→</span>}
          {strip.clearedAltitude && <span className="level-clr">{strip.clearedAltitude}</span>}
        </span>
        <AgeCell minutes={minutes} />
      </div>
      {strip.remarks && <div className="strip-remarks">{strip.remarks}</div>}
    </>
  )
}

function QuickBody({ strip, def, minutes }) {
  return (
    <>
      <div className="strip-cells">
        {def.key === 'info' && <span className="cell cell-time">{formatZulu(strip.createdAt)}</span>}
        <span className={`cell cell-grow ${def.key === 'vehicle' ? 'cell-callsign' : 'cell-text'}`}>
          {strip[def.quickField]}
        </span>
        <AgeCell minutes={minutes} />
      </div>
      {strip.notes && <div className="strip-remarks">{strip.notes}</div>}
    </>
  )
}

export default function Strip({ strip, now, onClick, innerRef, style, className = '', dragProps }) {
  const def = STRIP_TYPES[strip.type]
  const merged = strip.colorOverride ? { ...style, '--strip-accent': strip.colorOverride } : style
  const minutes = now != null ? minutesSince(strip.lastMovedAt, now) : null
  const kind = strip.type === 'flight' ? normalizeFlightKind(strip.flightKind) : undefined
  const kindMeta = kind ? FLIGHT_KIND_META[kind] : null
  const label = kindMeta ? `${kindMeta.label} flight` : def.label
  return (
    <div
      ref={innerRef}
      className={`strip ${className} ${minutes != null ? ageClass(minutes) : ''}`}
      data-type={strip.type}
      data-kind={kind}
      style={merged}
      onClick={onClick}
      {...dragProps}
    >
      <span className="strip-icon" aria-label={label} title={label}>
        {def.icon}
        {kindMeta?.code && <span className="strip-kind">{kindMeta.code}</span>}
      </span>
      <div className="strip-body">
        {strip.type === 'flight' ? (
          <FlightBody strip={strip} minutes={minutes} />
        ) : (
          <QuickBody strip={strip} def={def} minutes={minutes} />
        )}
      </div>
    </div>
  )
}
