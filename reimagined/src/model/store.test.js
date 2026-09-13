import { describe, expect, it } from 'vitest'
import { actions as A, alerts, departureSequence, initialState, landingSequence, onRunway, parseEta, reducer, tokensIn } from './store.js'
import { pathFor } from './template.js'

const T = (m) => `2026-09-13T10:${String(m).padStart(2, '0')}:00.000Z`
const run = (s, ...acts) => acts.reduce(reducer, s)
const S0 = () => initialState({ runwayId: 'r' })
const tok = (s, id) => s.tokens[id]
const seq = (s) => landingSequence(s).map((x) => `${x.number}:${tok(s, x.id).callsign}`)

describe('template paths', () => {
  it('derives land / circuit / depart paths from the place list', () => {
    const r = S0().runways.r
    expect(pathFor(r, 'land')).toEqual(['inbound', 'final', 'shortfinal', 'runway', 'vacated'])
    expect(pathFor(r, 'circuit')).toEqual(['downwind', 'base', 'final', 'shortfinal', 'runway', 'airborne', 'crosswind'])
    expect(pathFor(r, 'depart')).toEqual(['outbound', 'hold', 'lineup', 'runway', 'airborne', 'departed'])
  })
})

describe('tokens', () => {
  it('creates by kind with defaults and a received event', () => {
    const s = run(S0(), A.createToken('ifr', { callsign: ' SAS1234 ', type: 'A320' }, null, 'a', T(0)), A.createToken('vfr', { callsign: 'LN-ABC' }, null, 'v', T(0)), A.createToken('vehicle', { callsign: 'Follow-me 2' }, null, 'f', T(0)))
    expect(tok(s, 'a')).toMatchObject({ kind: 'ifr', intent: 'land', placeId: 'inbound', callsign: 'SAS1234', order: 0 })
    expect(tok(s, 'v')).toMatchObject({ kind: 'vfr', intent: 'circuit', squawk: '7000', placeId: 'inbound', order: 1 })
    expect(tok(s, 'f')).toMatchObject({ kind: 'vehicle', intent: 'none', placeId: 'vehicles', permissions: [] })
    expect(tok(s, 'a').events).toEqual([{ at: T(0), type: 'received', to: 'inbound' }])
    expect(run(s, A.createToken('bogus', {}, null, 'x'))).toBe(s)
  })

  it('outbound creation defaults to depart intent', () => {
    const s = run(S0(), A.createToken('ifr', { callsign: 'NAX22K' }, 'outbound', 'd', T(0)))
    expect(tok(s, 'd').intent).toBe('depart')
  })

  it('updateToken records changed fields only', () => {
    const s1 = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)))
    const s2 = run(s1, A.updateToken('a', { clearedLevel: 'FL100', callsign: 'A' }, T(1)))
    expect(tok(s2, 'a').clearedLevel).toBe('FL100')
    expect(tok(s2, 'a').events.at(-1)).toEqual({ at: T(1), type: 'field', detail: 'clearedLevel=FL100' })
    expect(run(s2, A.updateToken('a', { clearedLevel: 'FL100' }, T(2)))).toBe(s2)
  })
})

describe('moving', () => {
  it('advance follows the landing path and records each step; runway → vacated', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)))
    const places = []
    for (let i = 1; i <= 5; i++) {
      s = run(s, A.advance('a', 1, T(i)))
      places.push(tok(s, 'a').placeId)
    }
    expect(places).toEqual(['final', 'shortfinal', 'runway', 'vacated', 'vacated'])
    expect(tok(s, 'a').events.map((e) => e.type)).toEqual(['received', 'advance', 'advance', 'advance', 'advance'])
    expect(tok(s, 'a').circuits).toBe(0)
  })

  it('advance with steps skips states in one go', () => {
    const s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.advance('a', 3, T(1)))
    expect(tok(s, 'a').placeId).toBe('runway')
    expect(tok(s, 'a').events.at(-1)).toMatchObject({ type: 'advance', from: 'inbound', to: 'runway' })
  })

  it('circuit intent goes round and counts circuits when leaving the runway into the ring', () => {
    let s = run(S0(), A.createToken('vfr', { callsign: 'V' }, null, 'v', T(0)))
    const seen = []
    for (let i = 1; i <= 8; i++) {
      s = run(s, A.advance('v', 1, T(i)))
      seen.push(tok(s, 'v').placeId)
    }
    expect(seen).toEqual(['downwind', 'base', 'final', 'shortfinal', 'runway', 'airborne', 'crosswind', 'downwind'])
    expect(tok(s, 'v').circuits).toBe(1)
  })

  it('departure path: outbound → hold → lineup → runway → airborne → departed', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'D' }, 'outbound', 'd', T(0)))
    const seen = []
    for (let i = 1; i <= 6; i++) {
      s = run(s, A.advance('d', 1, T(i)))
      seen.push(tok(s, 'd').placeId)
    }
    expect(seen).toEqual(['hold', 'lineup', 'runway', 'airborne', 'departed', 'departed'])
    expect(tok(s, 'd').circuits).toBe(1) // runway → airborne counts as leaving the runway into the ring
  })

  it('back steps back; from final/short final/runway on a landing it is a go-around into the circuit', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.advance('a', 2, T(1)))
    expect(tok(s, 'a').placeId).toBe('shortfinal')
    s = run(s, A.back('a', T(2)))
    expect(tok(s, 'a')).toMatchObject({ placeId: 'airborne', intent: 'circuit' })
    expect(tok(s, 'a').events.at(-1)).toMatchObject({ type: 'go-around', from: 'shortfinal', to: 'airborne' })
    // a departure stepping back is a plain back
    let d = run(S0(), A.createToken('ifr', { callsign: 'D' }, 'outbound', 'd', T(0)), A.advance('d', 2, T(1)))
    d = run(d, A.back('d', T(2)))
    expect(tok(d, 'd').placeId).toBe('hold')
    expect(tok(d, 'd').events.at(-1).type).toBe('back')
  })

  it('explicit move orders within a place and across places', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.createToken('ifr', { callsign: 'B' }, null, 'b', T(0)), A.createToken('ifr', { callsign: 'C' }, null, 'c', T(0)))
    s = run(s, A.moveToken('c', 'inbound', 0, T(1)))
    expect(tokensIn(s, 'inbound').map((t) => t.callsign)).toEqual(['C', 'A', 'B'])
    s = run(s, A.moveToken('a', 'park', null, T(2)))
    expect(tokensIn(s, 'inbound').map((t) => t.callsign)).toEqual(['C', 'B'])
    expect(tokensIn(s, 'park').map((t) => t.callsign)).toEqual(['A'])
    expect(tok(s, 'a').lastMovedAt).toBe(T(2))
    expect(run(s, A.moveToken('a', 'nowhere'))).toBe(s)
  })

  it('a parked token (intent none) does not advance', () => {
    const s = run(S0(), A.createToken('info', { callsign: 'Birds' }, null, 'i', T(0)))
    expect(run(s, A.advance('i'))).toBe(s)
  })
})

describe('leaving the board', () => {
  it('transfer moves the token to history with a transferred event; restore brings it back', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.transfer('a', 'APP', T(1)))
    expect(s.tokens.a).toBeUndefined()
    expect(s.history[0]).toMatchObject({ id: 'a', events: [{ type: 'received' }, { type: 'transferred', from: 'inbound', detail: 'APP' }] })
    s = run(s, A.restoreToken(s.history[0]))
    expect(s.tokens.a.placeId).toBe('inbound')
    expect(s.history).toEqual([])
  })

  it('removeToken records removed; history is capped', () => {
    let s = S0()
    for (let i = 0; i < 505; i++) s = run(s, A.createToken('info', { callsign: `m${i}` }, null, `i${i}`, T(0)), A.removeToken(`i${i}`, T(0)))
    expect(s.history).toHaveLength(500)
    expect(s.history[0].callsign).toBe('m504')
    expect(s.history[0].events.at(-1).type).toBe('removed')
  })
})

describe('sequences', () => {
  it('landing sequence: closest to the runway first, then inbound lane order', () => {
    let s = run(
      S0(),
      A.createToken('ifr', { callsign: 'IN1' }, null, 'i1', T(0)),
      A.createToken('ifr', { callsign: 'IN2' }, null, 'i2', T(0)),
      A.createToken('vfr', { callsign: 'CIR' }, null, 'c', T(0)),
      A.createToken('ifr', { callsign: 'FIN' }, null, 'f', T(0)),
    )
    s = run(s, A.advance('f', 1, T(1)), A.advance('c', 1, T(1))) // FIN on final, CIR on downwind
    expect(seq(s)).toEqual(['1:FIN', '2:CIR', '3:IN1', '4:IN2'])
    s = run(s, A.advance('f', 2, T(2))) // FIN on runway → out of the sequence
    expect(seq(s)).toEqual(['1:CIR', '2:IN1', '3:IN2'])
    s = run(s, A.moveToken('i2', 'inbound', 0, T(3))) // re-sequence by dragging
    expect(seq(s)).toEqual(['1:CIR', '2:IN2', '3:IN1'])
  })

  it('departure sequence: line up, holding point, outbound', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'D1' }, 'outbound', 'd1', T(0)), A.createToken('ifr', { callsign: 'D2' }, 'outbound', 'd2', T(0)), A.createToken('ifr', { callsign: 'D3' }, 'outbound', 'd3', T(0)))
    s = run(s, A.advance('d3', 2, T(1)), A.advance('d2', 1, T(1)))
    expect(departureSequence(s).map((x) => `${x.number}:${tok(s, x.id).callsign}`)).toEqual(['1:D3', '2:D2', '3:D1'])
  })
})

const noSkip = (list) => list.filter((a) => !a.id.startsWith('skipped:'))

describe('attention', () => {
  it('flags two on the runway, and runway occupied with traffic on short final', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.createToken('ifr', { callsign: 'B' }, null, 'b', T(0)))
    s = run(s, A.advance('a', 3, T(1)))
    expect(noSkip(alerts(s, Date.parse(T(1))))).toEqual([])
    s = run(s, A.advance('b', 2, T(2))) // B on short final while A on runway
    expect(noSkip(alerts(s, Date.parse(T(2)))).map((x) => x.id)).toEqual(['short-final'])
    s = run(s, A.advance('b', 1, T(3))) // both on runway
    expect(noSkip(alerts(s, Date.parse(T(3)))).map((x) => [x.id, x.level])).toEqual([['occupancy', 'alarm']])
  })

  it('a vehicle with runway permission counts as on the runway', () => {
    let s = run(S0(), A.createToken('vehicle', { callsign: 'Sweeper 1' }, null, 'v', T(0)), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)))
    s = run(s, A.setPermissions('v', ['TWY A', 'runway'], T(1)))
    expect(onRunway(s).map((t) => t.id)).toEqual(['v'])
    s = run(s, A.advance('a', 1, T(2))) // A on final
    expect(alerts(s, Date.parse(T(2))).map((x) => x.id)).toEqual(['vehicle-final'])
    s = run(s, A.setPermissions('v', ['TWY A'], T(3)))
    expect(alerts(s, Date.parse(T(3)))).toEqual([])
  })

  it('flags stale tokens and due timers', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'D' }, 'outbound', 'd', T(0)), A.advance('d', 1, T(0)), A.advance('d', 1, T(0))) // lineup, stale after 3 min
    expect(alerts(s, Date.parse(T(2)))).toEqual([])
    expect(alerts(s, Date.parse(T(4))).map((x) => x.id)).toEqual(['stale:d'])
    s = run(s, A.addTimer('d', T(10), 'call back', 't1', T(0)))
    expect(alerts(s, Date.parse(T(9))).map((x) => x.id)).toEqual(['stale:d'])
    expect(alerts(s, Date.parse(T(11))).map((x) => x.id)).toEqual(['stale:d', 'timer:t1'])
    s = run(s, A.clearTimer('d', 't1'))
    expect(tok(s, 'd').timers).toEqual([])
  })
})

describe('missed steps', () => {
  it('flags a transition that skipped a step until the next transition', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.advance('a', 1, T(1)), A.advance('a', 2, T(2))) // final → runway, skipping short final
    expect(alerts(s, Date.parse(T(2))).map((x) => x.text)).toEqual(['A skipped Short final'])
    s = run(s, A.advance('a', 1, T(3))) // runway → vacated, adjacent
    expect(alerts(s, Date.parse(T(3)))).toEqual([])
    // circuit wrap: shortfinal → airborne skipping the runway is a skip of 1 (runway)
    let v = run(S0(), A.createToken('vfr', { callsign: 'V' }, null, 'v', T(0)), A.advance('v', 4, T(1)))
    expect(v.tokens.v.placeId).toBe('shortfinal')
    v = run(v, A.advance('v', 2, T(2)))
    expect(alerts(v, Date.parse(T(2))).map((x) => x.text)).toEqual(['V skipped Runway'])
  })
})

describe('runway config', () => {
  it('flipRunway swaps the end in use', () => {
    const s = run(S0(), A.flipRunway('r'))
    expect(s.runways.r.inUse).toBe('19')
    expect(run(s, A.flipRunway('r')).runways.r.inUse).toBe('01')
  })

  it('setPlaces accepts a custom ring and parks tokens whose place vanished', () => {
    let s = run(S0(), A.createToken('ifr', { callsign: 'A' }, null, 'a', T(0)), A.advance('a', 2, T(1))) // shortfinal
    const places = S0().runways.r.places.filter((p) => p.id !== 'shortfinal')
    s = run(s, A.setPlaces('r', places))
    expect(tok(s, 'a').placeId).toBe('park')
    expect(pathFor(s.runways.r, 'land')).toEqual(['inbound', 'final', 'runway', 'vacated'])
    expect(run(s, A.setPlaces('r', places.filter((p) => p.kind !== 'runway')))).toBe(s) // must keep one runway
  })
})

describe('ETA', () => {
  it('parseEta accepts HHMM and HH:MM', () => {
    expect(parseEta('1432')).toBe(872)
    expect(parseEta('14:32')).toBe(872)
    expect(parseEta('2460')).toBeNull()
    expect(parseEta('')).toBeNull()
  })

  it('sortInboundByEta reorders the lane and the landing sequence follows', () => {
    let s = run(
      S0(),
      A.createToken('ifr', { callsign: 'A', eta: '1450' }, null, 'a', T(0)),
      A.createToken('ifr', { callsign: 'B' }, null, 'b', T(0)),
      A.createToken('ifr', { callsign: 'C', eta: '1440' }, null, 'c', T(0)),
    )
    expect(seq(s)).toEqual(['1:A', '2:B', '3:C'])
    s = run(s, A.sortInboundByEta(T(1)))
    expect(seq(s)).toEqual(['1:C', '2:A', '3:B'])
    expect(run(s, A.sortInboundByEta(T(2)))).toBe(s)
  })
})
