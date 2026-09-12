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

function FlightBody({ strip, minutes, onEditLevel }) {
  return (
    <>
      <div className="strip-cells strip-row">
        <span className="cell cell-callsign">{strip.callsign}</span>
        <span className="cell cell-actype">{strip.aircraftType}</span>
        <span className="cell cell-squawk cell-end">{strip.squawk}</span>
      </div>
      <div className="strip-cells strip-row strip-row-2">
        <span className="cell cell-route">{strip.route}</span>
        <button
          type="button"
          className="cell cell-levels cell-end cell-tap"
          title="Tap to set cleared level"
          aria-label={`Cleared level ${strip.clearedAltitude || 'not set'}; tap to change`}
          onClick={(e) => {
            e.stopPropagation()
            onEditLevel?.(e.currentTarget.getBoundingClientRect())
          }}
        >
          {strip.requestedAltitude && <span className="level-req">{strip.requestedAltitude}</span>}
          {strip.requestedAltitude && <span className="level-arrow">→</span>}
          <span className={`level-clr ${strip.clearedAltitude ? '' : 'is-empty'}`}>
            {strip.clearedAltitude || '– – –'}
          </span>
        </button>
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
        <span className="cell cell-time" title="Added">
          {formatZulu(strip.createdAt)}
        </span>
        <span className="cell cell-grow cell-big">{strip[def.quickField]}</span>
        <AgeCell minutes={minutes} />
      </div>
      {strip.notes && <div className="strip-remarks">{strip.notes}</div>}
    </>
  )
}

export default function Strip({ strip, now, onClick, onEditLevel, innerRef, style, className = '', dragProps }) {
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
          <FlightBody strip={strip} minutes={minutes} onEditLevel={onEditLevel} />
        ) : (
          <QuickBody strip={strip} def={def} minutes={minutes} />
        )}
      </div>
    </div>
  )
}
