// Registry of strip types. Adding a type means adding an entry here plus a
// render case in Strip.jsx and (if not quick-add) a form — nothing in the
// bay or drag-and-drop code should need to know about it.

/** Arrival / departure / other — drives the flight strip's colour. */
export const FLIGHT_KINDS = ['arrival', 'departure', 'other']
export const FLIGHT_KIND_META = {
  arrival: { label: 'Arrival', code: 'ARR' },
  departure: { label: 'Departure', code: 'DEP' },
  other: { label: 'Other', code: '' },
}
export const DEFAULT_FLIGHT_KIND = 'other'

export function normalizeFlightKind(value) {
  return FLIGHT_KINDS.includes(value) ? value : DEFAULT_FLIGHT_KIND
}

/** Free-text fields of a flight strip (flightKind is handled separately). */
export const FLIGHT_FIELDS = [
  'callsign',
  'aircraftType',
  'route',
  'requestedAltitude',
  'clearedAltitude',
  'squawk',
  'remarks',
]

export const STRIP_TYPES = {
  flight: {
    key: 'flight',
    label: 'Flight',
    icon: '✈',
    accentVar: '--accent-flight',
    quickAdd: false,
    fields: FLIGHT_FIELDS,
  },
  info: {
    key: 'info',
    label: 'Info',
    icon: 'ⓘ',
    accentVar: '--accent-info',
    quickAdd: true,
    quickField: 'message',
    quickLabel: 'Message',
    fields: ['message', 'notes'],
  },
  vehicle: {
    key: 'vehicle',
    label: 'Vehicle',
    icon: '⛟',
    accentVar: '--accent-vehicle',
    quickAdd: true,
    quickField: 'vehicleId',
    quickLabel: 'Vehicle ID',
    fields: ['vehicleId', 'notes'],
  },
  /**
   * A divider is furniture inside a bay: a line strips are moved above or
   * below. It lives in stripOrder like a strip (so it drags, undoes and
   * exports for free) but is not a record: never archived, not counted,
   * no age, no expand, no highlight, cannot span.
   */
  divider: {
    key: 'divider',
    label: 'Divider',
    icon: '—',
    accentVar: '--chrome',
    quickAdd: false,
    divider: true,
    fields: ['label'],
  },
}

/** Types offered by the add-strip buttons (dividers come from the bay menu). */
export const STRIP_TYPE_ORDER = ['flight', 'info', 'vehicle']

export function isDivider(strip) {
  return strip?.type === 'divider'
}

export function getStripType(type) {
  const def = STRIP_TYPES[type]
  if (!def) throw new Error(`Unknown strip type: ${type}`)
  return def
}

/** Short human label for a strip of any type (callsign / vehicle ID / message). */
export function stripLabel(strip) {
  const def = STRIP_TYPES[strip.type]
  if (def?.divider) return strip.label || 'Divider'
  const value = def?.quickAdd ? strip[def.quickField] : strip.callsign
  return value || strip.id
}

/** The text a strip hides while collapsed: remarks for flights, notes otherwise. */
export function hiddenText(strip) {
  if (isDivider(strip)) return ''
  return (strip.type === 'flight' ? strip.remarks : strip.notes) || ''
}
