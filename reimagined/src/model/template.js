/**
 * A runway is a set of *places* a token can be in, plus the *paths* a token
 * follows through them depending on its intent. Everything here is data:
 * a runway can rename, add, reorder or remove places, and the paths are
 * derived from place kinds so a custom place slots in.
 *
 * Place kinds:
 *   lane    – holding area off the flow (inbound, outbound, park, vehicles)
 *   dep     – departure-side steps before the runway (holding point, line up)
 *   ring    – the circuit, in order (airborne … short final)
 *   runway  – the shared runway segment (exactly one per runway)
 *   exit    – where tokens leave the flow (vacated, departed)
 */

export const PLACE_KINDS = ['lane', 'dep', 'ring', 'runway', 'exit']

/** Lanes every runway has; ids are fixed so the UI can find them. */
export const LANES = {
  inbound: { id: 'inbound', name: 'Inbound', kind: 'lane' },
  outbound: { id: 'outbound', name: 'Outbound', kind: 'lane' },
  park: { id: 'park', name: 'Park', kind: 'lane' },
  vehicles: { id: 'vehicles', name: 'Vehicles', kind: 'lane' },
}

export const EXITS = {
  vacated: { id: 'vacated', name: 'Vacated', kind: 'exit' },
  departed: { id: 'departed', name: 'Departed', kind: 'exit' },
}

/** The starting set for a single runway; editable per runway afterwards. */
export function defaultRunway(id, name = '01', reciprocal = '19') {
  return {
    id,
    name,
    reciprocal,
    inUse: name, // which end is in use; flipping swaps name/reciprocal
    places: [
      LANES.inbound,
      LANES.outbound,
      LANES.park,
      LANES.vehicles,
      { id: 'hold', name: 'Holding point', kind: 'dep' },
      { id: 'lineup', name: 'Line up', kind: 'dep' },
      { id: 'airborne', name: 'Airborne', kind: 'ring' },
      { id: 'crosswind', name: 'Crosswind', kind: 'ring' },
      { id: 'downwind', name: 'Downwind', kind: 'ring' },
      { id: 'base', name: 'Base', kind: 'ring' },
      { id: 'final', name: 'Final', kind: 'ring' },
      { id: 'shortfinal', name: 'Short final', kind: 'ring' },
      { id: 'runway', name: 'Runway', kind: 'runway' },
      EXITS.vacated,
      EXITS.departed,
    ],
    /** Where straight-in arrivals join the ring, and where VFR joins the circuit. */
    joins: { land: 'final', circuit: 'downwind' },
    /** Vehicle permission areas besides the runway itself. */
    areas: ['TWY A', 'TWY B'],
    /** Minutes before a token in a place is flagged stale (null = never). */
    staleAfter: { hold: 10, lineup: 3, runway: 3, inbound: null, outbound: null },
    /** Ids of runways that cross this one (occupancy is shared). */
    crossing: [],
  }
}

/** Ordered ring place ids (kind 'ring') followed by the runway id. */
export function ringOrder(runway) {
  return runway.places.filter((p) => p.kind === 'ring' || p.kind === 'runway').map((p) => p.id)
}

export function depOrder(runway) {
  return runway.places.filter((p) => p.kind === 'dep').map((p) => p.id)
}

export function runwayPlaceId(runway) {
  return runway.places.find((p) => p.kind === 'runway')?.id ?? 'runway'
}

export function placeById(runway, id) {
  return runway.places.find((p) => p.id === id) ?? null
}

/**
 * The forward path for an intent, as an array of place ids. `circuit` is
 * cyclic (the caller wraps); the others end at an exit.
 */
export function pathFor(runway, intent) {
  const ring = ringOrder(runway) // airborne … shortfinal, runway
  const rwy = runwayPlaceId(runway)
  const airborne = ring[0]
  switch (intent) {
    case 'circuit': {
      // whole ring, starting at the join point so a token entering from inbound lands on it
      const start = ring.indexOf(runway.joins.circuit)
      return start > 0 ? [...ring.slice(start), ...ring.slice(0, start)] : ring
    }
    case 'depart':
      return ['outbound', ...depOrder(runway), rwy, airborne, 'departed']
    case 'land':
    default: {
      const start = ring.indexOf(runway.joins.land)
      const approach = start >= 0 ? ring.slice(start) : ring
      return ['inbound', ...approach, 'vacated']
    }
  }
}
