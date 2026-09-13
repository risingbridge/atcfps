import { describe, expect, it } from 'vitest'
import { actions as A, initialState, reducer } from '../model/store.js'
import { recall } from './recall.js'

describe('recall', () => {
  it('suggests by prefix from history and current tokens, de-duplicated', () => {
    let s = initialState({ runwayId: 'r' })
    s = reducer(s, A.createToken('ifr', { callsign: 'SAS1234', type: 'A320', wake: 'M' }, null, 'a', '2026-09-13T09:00:00.000Z'))
    s = reducer(s, A.transfer('a', 'APP', '2026-09-13T09:30:00.000Z'))
    s = reducer(s, A.createToken('ifr', { callsign: 'SAS1234', type: 'A320' }, null, 'b', '2026-09-13T10:00:00.000Z'))
    s = reducer(s, A.createToken('vfr', { callsign: 'LN-ABC', type: 'C172' }, null, 'c', '2026-09-13T10:00:00.000Z'))
    s = reducer(s, A.createToken('vehicle', { callsign: 'Sweeper' }, null, 'v', '2026-09-13T10:00:00.000Z'))
    expect(recall(s, 'sas').map((r) => r.callsign)).toEqual(['SAS1234'])
    expect(recall(s, 'SAS')[0]).toMatchObject({ type: 'A320', wake: 'M', kind: 'ifr' })
    expect(recall(s, 'L').map((r) => r.callsign)).toEqual(['LN-ABC'])
    expect(recall(s, 'SW')).toEqual([])
    expect(recall(s, '')).toEqual([])
  })
})
