import { FLIGHT_KIND_META, STRIP_TYPES, hiddenText, isDivider, normalizeFlightKind } from '../lib/stripTypes.js'
import { ageClass, formatMinutes, formatZulu, minutesSince } from '../lib/time.js'

function AgeCell({ minutes }) {
  if (minutes == null) return null
  return (
    <span className="cell cell-age" title={`${formatMinutes(minutes)} in this bay`}>
      {formatMinutes(minutes)}
    </span>
  )
}

function FlightBody({ strip, minutes, onEditLevel, expanded }) {
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
      {expanded && strip.remarks && <div className="strip-remarks">{strip.remarks}</div>}
    </>
  )
}

function QuickBody({ strip, def, minutes, expanded }) {
  return (
    <>
      <div className="strip-cells strip-main">
        <span className="cell cell-time" title="Added">
          {formatZulu(strip.createdAt)}
        </span>
        <span className="cell cell-grow cell-big">
          <span className={expanded ? '' : 'clamp-2'}>{strip[def.quickField]}</span>
        </span>
        <AgeCell minutes={minutes} />
      </div>
      {expanded && strip.notes && <div className="strip-remarks">{strip.notes}</div>}
    </>
  )
}



export default function Strip({ strip, now, onClick, onEditLevel, onToggle, innerRef, style, className = '', dragProps }) {
  const def = STRIP_TYPES[strip.type]
  if (isDivider(strip)) {
    return (
      <div
        ref={innerRef}
        className={`divider ${className}`}
        data-type="divider"
        data-strip-id={strip.id}
        style={style}
        onClick={onClick}
        role="separator"
        aria-label={strip.label ? `Divider: ${strip.label}` : 'Divider'}
        {...dragProps}
      >
        <span className="divider-line" />
        {strip.label && <span className="divider-label">{strip.label}</span>}
        <span className="divider-line" />
      </div>
    )
  }
  const merged = strip.colorOverride ? { ...style, '--strip-accent': strip.colorOverride } : style
  const minutes = now != null ? minutesSince(strip.lastMovedAt, now) : null
  const kind = strip.type === 'flight' ? normalizeFlightKind(strip.flightKind) : undefined
  const kindMeta = kind ? FLIGHT_KIND_META[kind] : null
  const label = kindMeta ? `${kindMeta.label} flight` : def.label
  const expanded = !!strip.expanded
  const hasHidden = hiddenText(strip).length > 0
  return (
    <div
      ref={innerRef}
      className={`strip ${className} ${minutes != null ? ageClass(minutes) : ''} ${expanded ? 'is-expanded' : ''}`}
      data-type={strip.type}
      data-kind={kind}
      data-strip-id={strip.id}
      style={merged}
      onClick={onClick}
      {...dragProps}
    >
      <button
        type="button"
        className="strip-icon"
        title={hasHidden ? (expanded ? 'Hide notes' : 'Show notes') : label}
        aria-label={`${label}${hasHidden ? (expanded ? '; hide notes' : '; show notes') : ''}`}
        aria-expanded={hasHidden ? expanded : undefined}
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.()
        }}
      >
        <span className="strip-glyph">{def.icon}</span>
        {kindMeta?.code && <span className="strip-kind">{kindMeta.code}</span>}
        {hasHidden && <span className="strip-chevron">{expanded ? '▾' : '▸'}</span>}
      </button>
      <div className="strip-body">
        {strip.type === 'flight' ? (
          <FlightBody strip={strip} minutes={minutes} onEditLevel={onEditLevel} expanded={expanded} />
        ) : (
          <QuickBody strip={strip} def={def} minutes={minutes} expanded={expanded} />
        )}
      </div>
    </div>
  )
}
