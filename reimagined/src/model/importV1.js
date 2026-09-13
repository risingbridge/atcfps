import { makeId } from '../lib/id.js'
import { actions } from './store.js'

/**
 * Bring a strip-board (v1) board onto the flow board: each strip becomes a
 * token; its bay name decides where it lands, else Park. Returns the list
 * of actions to dispatch, so the caller controls ids/timestamps in tests.
 */
export function importV1Board(board, { at = new Date().toISOString(), id = makeId } = {}) {
  const out = []
  if (!board?.bayOrder || !board.bays || !board.strips) return out
  for (const bayId of board.bayOrder) {
    const bay = board.bays[bayId]
    if (!bay) continue
    const placeId = placeForBayName(bay.name)
    for (const stripId of bay.stripOrder ?? []) {
      const s = board.strips[stripId]
      if (!s || s.type === 'divider') continue
      const kind = s.type === 'flight' ? (isVfr(s) ? 'vfr' : 'ifr') : s.type === 'vehicle' ? 'vehicle' : 'info'
      const fields =
        s.type === 'flight'
          ? {
              callsign: s.callsign ?? '',
              type: s.aircraftType ?? '',
              squawk: s.squawk ?? '',
              clearedLevel: s.clearedAltitude ?? '',
              remarks: [s.route, s.remarks].filter(Boolean).join(' · '),
              intent: s.flightKind === 'departure' ? 'depart' : isVfr(s) ? 'circuit' : 'land',
            }
          : { callsign: s.vehicleId ?? s.message ?? '', remarks: s.notes ?? '' }
      const target = kind === 'vehicle' ? 'vehicles' : placeId
      out.push(actions.createToken(kind, fields, target, id(), at))
    }
  }
  return out
}

function isVfr(s) {
  return /^7000$/.test(s.squawk ?? '') || /^[A-Z]{2}-[A-Z]{3}$/.test(s.callsign ?? '')
}

/** Map a v1 bay name onto a flow place; anything unrecognised parks. */
export function placeForBayName(name = '') {
  const n = name.toLowerCase()
  if (/short/.test(n)) return 'shortfinal'
  if (/final/.test(n)) return 'final'
  if (/downwind/.test(n)) return 'downwind'
  if (/\bbase\b/.test(n)) return 'base'
  if (/line ?up/.test(n)) return 'lineup'
  if (/hold/.test(n)) return 'hold'
  if (/rwy|runway/.test(n)) return 'runway'
  if (/arriv|inbound|approach/.test(n)) return 'inbound'
  if (/depart|outbound|ground|taxi|twy/.test(n)) return 'outbound'
  if (/vehicle/.test(n)) return 'vehicles'
  return 'park'
}
