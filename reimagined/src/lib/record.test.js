import { describe, expect, it } from 'vitest'
import { actions as A, initialState, reducer } from '../model/store.js'
import { shiftCsv, shiftRows } from './record.js'

describe('shift record', () => {
  it('flattens all events oldest first and escapes CSV', () => {
    let s = initialState({ runwayId: 'r' })
    s = reducer(s, A.createToken('ifr', { callsign: 'SAS1234' }, null, 'a', '2026-09-13T10:00:00.000Z'))
    s = reducer(s, A.addNote('a', 'said "hold short", twice', '2026-09-13T10:01:00.000Z'))
    s = reducer(s, A.advance('a', 1, '2026-09-13T10:02:00.000Z'))
    s = reducer(s, A.transfer('a', 'APP', '2026-09-13T10:03:00.000Z'))
    const rows = shiftRows(s)
    expect(rows.map((r) => r.type)).toEqual(['received', 'note', 'advance', 'transferred'])
    const csv = shiftCsv(s)
    expect(csv.split('\n')[0]).toBe('time_utc,runway,callsign,kind,event,from,to,detail')
    expect(csv).toContain('"said ""hold short"", twice"')
    expect(csv).toContain('2026-09-13T10:03:00.000Z,01,SAS1234,ifr,transferred,final,,APP')
  })
})
