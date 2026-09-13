import { describe, expect, it } from 'vitest'
import { importV1Board, placeForBayName } from './importV1.js'
import { initialState, reducer, tokensIn } from './store.js'

describe('importV1Board', () => {
  it('maps bays to places by name and strips to token kinds', () => {
    const board = {
      bayOrder: ['a', 'b', 'c'],
      bays: {
        a: { name: 'Arrivals', stripOrder: ['s1', 's2'] },
        b: { name: 'RWY 01', stripOrder: ['v1', 'd'] },
        c: { name: 'Misc', stripOrder: ['i1'] },
      },
      strips: {
        s1: { type: 'flight', callsign: 'SAS1234', aircraftType: 'A320', squawk: '4721', clearedAltitude: 'FL100', route: 'ENGM–EKCH', remarks: 'direct', flightKind: 'arrival' },
        s2: { type: 'flight', callsign: 'LN-ABC', aircraftType: 'C172', squawk: '7000', flightKind: 'other' },
        v1: { type: 'vehicle', vehicleId: 'Sweeper 1', notes: 'ch 3' },
        d: { type: 'divider', label: 'x' },
        i1: { type: 'info', message: 'Birds', notes: '' },
      },
    }
    let n = 0
    const acts = importV1Board(board, { at: '2026-09-13T10:00:00.000Z', id: () => `t${++n}` })
    const s = acts.reduce(reducer, initialState({ runwayId: 'r' }))
    expect(tokensIn(s, 'inbound').map((t) => [t.kind, t.callsign, t.intent])).toEqual([
      ['ifr', 'SAS1234', 'land'],
      ['vfr', 'LN-ABC', 'circuit'],
    ])
    expect(s.tokens.t1).toMatchObject({ type: 'A320', squawk: '4721', clearedLevel: 'FL100', remarks: 'ENGM–EKCH · direct' })
    expect(tokensIn(s, 'vehicles').map((t) => t.callsign)).toEqual(['Sweeper 1'])
    expect(tokensIn(s, 'park').map((t) => [t.kind, t.callsign])).toEqual([['info', 'Birds']])
    expect(Object.keys(s.tokens)).toHaveLength(4) // divider skipped
  })

  it('placeForBayName', () => {
    expect(placeForBayName('Short final')).toBe('shortfinal')
    expect(placeForBayName('Final')).toBe('final')
    expect(placeForBayName('Holding A1')).toBe('hold')
    expect(placeForBayName('Line up')).toBe('lineup')
    expect(placeForBayName('Departures')).toBe('outbound')
    expect(placeForBayName('Whatever')).toBe('park')
  })
})
