import { describe, expect, it } from 'vitest'
import { actions as A, initialState, reducer } from '../state/store.js'
import { parseImport } from './exportImport.js'

const board = reducer(reducer(initialState({ boardId: 'b' }), A.addBay('b', 'X', 'x')), A.createQuickStrip('b', 'x', 'info', 'Hi', 's', '2026-01-01T00:00:00.000Z')).boards.b

describe('parseImport', () => {
  it('accepts a single-board export', () => {
    const out = parseImport(JSON.stringify({ format: 'atcfps', version: 1, kind: 'board', board }))
    expect(out.boards).toHaveLength(1)
    expect(out.boards[0].bays.x.stripOrder).toEqual(['s'])
    expect(out.presets).toEqual({ vehicle: [], info: [], divider: [] })
  })
  it('accepts an all-boards export', () => {
    const out = parseImport(
      JSON.stringify({ format: 'atcfps', version: 1, kind: 'boards', boards: [board, board], settings: { vehicles: ['Fire 1', ' fire 1'] } }),
    )
    expect(out.boards).toHaveLength(2)
    expect(out.presets.vehicle).toEqual([{ label: 'Fire 1', notes: '' }]) // legacy shape
    const out2 = parseImport(
      JSON.stringify({ format: 'atcfps', version: 1, kind: 'boards', boards: [board], settings: { presets: { info: [{ label: 'Wind', notes: 'n' }] } } }),
    )
    expect(out2.presets).toEqual({ vehicle: [], info: [{ label: 'Wind', notes: 'n' }], divider: [] })
  })
  it('accepts a bare board object', () => {
    expect(parseImport(JSON.stringify(board)).boards).toHaveLength(1)
  })
  it('rejects junk with readable errors', () => {
    expect(() => parseImport('nope')).toThrow('Not a JSON file')
    expect(() => parseImport('{"hello":1}')).toThrow('Not an ATC strip board export')
    expect(() => parseImport('{"format":"atcfps","kind":"boards","boards":[]}')).toThrow('no boards')
  })
})
