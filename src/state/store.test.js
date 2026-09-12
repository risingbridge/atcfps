import { describe, expect, it } from 'vitest'
import { ARCHIVE_LIMIT, actions as A, initialState, reducer, sanitizeBoard, shiftInOrder } from './store.js'

const T0 = '2026-09-12T10:00:00.000Z'
const T1 = '2026-09-12T10:05:00.000Z'

function run(state, ...acts) {
  return acts.reduce(reducer, state)
}

/** A board "b" with bays "x" (strips s1, s2, s3), "y" (strip s4), "z" (empty). */
function fixture() {
  return run(
    initialState({ boardId: 'b' }),
    A.addBay('b', 'X', 'x'),
    A.addBay('b', 'Y', 'y'),
    A.addBay('b', 'Z', 'z'),
    A.createFlightStrip('b', 'x', { callsign: 'SAS1' }, 's1', T0),
    A.createFlightStrip('b', 'x', { callsign: 'SAS2' }, 's2', T0),
    A.createQuickStrip('b', 'x', 'info', 'Turb FL300', 's3', T0),
    A.createQuickStrip('b', 'y', 'vehicle', 'Follow-me 2', 's4', T0),
  )
}

/** Every strip ID appears in exactly one bay, and that bay matches currentBayId. */
function assertInvariants(board) {
  const seen = new Map()
  for (const bayId of board.bayOrder) {
    expect(board.bays[bayId]).toBeDefined()
    for (const id of board.bays[bayId].stripOrder) {
      expect(seen.has(id)).toBe(false)
      seen.set(id, bayId)
    }
  }
  expect(Object.keys(board.bays).sort()).toEqual([...board.bayOrder].sort())
  expect([...seen.keys()].sort()).toEqual(Object.keys(board.strips).sort())
  for (const [id, bayId] of seen) expect(board.strips[id].currentBayId).toBe(bayId)
}

describe('boards', () => {
  it('starts with one empty active board', () => {
    const s = initialState({ boardId: 'b' })
    expect(s.boardOrder).toEqual(['b'])
    expect(s.activeBoardId).toBe('b')
    expect(s.boards.b.bayOrder).toEqual([])
  })

  it('creates a board, empty, and makes it active', () => {
    const s = run(initialState({ boardId: 'b' }), A.createBoard('Tower', 'b2'))
    expect(s.boardOrder).toEqual(['b', 'b2'])
    expect(s.activeBoardId).toBe('b2')
    expect(s.boards.b2).toMatchObject({ name: 'Tower', bayOrder: [], bays: {}, strips: {} })
  })

  it('renames a board, ignoring blank names', () => {
    let s = run(initialState({ boardId: 'b' }), A.renameBoard('b', '  Approach '))
    expect(s.boards.b.name).toBe('Approach')
    const before = s
    s = run(s, A.renameBoard('b', '   '))
    expect(s).toBe(before)
  })

  it('setActiveBoard ignores unknown ids', () => {
    const s = initialState({ boardId: 'b' })
    expect(run(s, A.setActiveBoard('nope'))).toBe(s)
  })

  it('deleting the active board activates the previous one', () => {
    let s = run(initialState({ boardId: 'b' }), A.createBoard('B2', 'b2'), A.createBoard('B3', 'b3'))
    s = run(s, A.deleteBoard('b3', 'r'))
    expect(s.boardOrder).toEqual(['b', 'b2'])
    expect(s.activeBoardId).toBe('b2')
    s = run(s, A.deleteBoard('b', 'r'))
    expect(s.activeBoardId).toBe('b2')
  })

  it('deleting a non-active board keeps the active one', () => {
    let s = run(initialState({ boardId: 'b' }), A.createBoard('B2', 'b2'), A.setActiveBoard('b'))
    s = run(s, A.deleteBoard('b2', 'r'))
    expect(s.activeBoardId).toBe('b')
    expect(s.boards.r).toBeUndefined()
  })

  it('deleting the last board replaces it with a fresh empty one', () => {
    const s = run(fixture(), A.deleteBoard('b', 'r'))
    expect(s.boardOrder).toEqual(['r'])
    expect(s.activeBoardId).toBe('r')
    expect(s.boards.r.bayOrder).toEqual([])
  })
})

describe('bays', () => {
  it('adds bays in order with default names when blank', () => {
    const s = run(initialState({ boardId: 'b' }), A.addBay('b', 'Arrivals', 'x'), A.addBay('b', '', 'y'))
    expect(s.boards.b.bayOrder).toEqual(['x', 'y'])
    expect(s.boards.b.bays.y.name).toBe('Bay 2')
  })

  it('renames and colours a bay', () => {
    let s = run(fixture(), A.renameBay('b', 'x', 'Departures'), A.setBayColor('b', 'x', '#abc'))
    expect(s.boards.b.bays.x).toMatchObject({ name: 'Departures', color: '#abc' })
    s = run(s, A.setBayColor('b', 'x', null))
    expect('color' in s.boards.b.bays.x).toBe(false)
  })

  it('reorders bays only with a valid permutation', () => {
    const s0 = fixture()
    const s = run(s0, A.reorderBays('b', ['z', 'x', 'y']))
    expect(s.boards.b.bayOrder).toEqual(['z', 'x', 'y'])
    expect(run(s0, A.reorderBays('b', ['z', 'x']))).toBe(s0)
    expect(run(s0, A.reorderBays('b', ['z', 'x', 'x']))).toBe(s0)
    expect(run(s0, A.reorderBays('b', ['z', 'x', 'q']))).toBe(s0)
  })

  it('shiftInOrder moves an id and clamps at the ends', () => {
    expect(shiftInOrder(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(shiftInOrder(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
    expect(shiftInOrder(['a', 'b', 'c'], 'c', -5)).toEqual(['c', 'a', 'b'])
  })

  it('deleting a bay cascades to its strips', () => {
    const s = run(fixture(), A.deleteBay('b', 'x'))
    const board = s.boards.b
    expect(board.bayOrder).toEqual(['y', 'z'])
    expect(Object.keys(board.strips)).toEqual(['s4'])
    assertInvariants(board)
  })
})

describe('strip creation', () => {
  it('creates a flight strip with only known fields', () => {
    const s = run(
      initialState({ boardId: 'b' }),
      A.addBay('b', 'X', 'x'),
      A.createFlightStrip('b', 'x', { callsign: 'NAX22', squawk: '4711', bogus: 'no' }, 's', T0),
    )
    const strip = s.boards.b.strips.s
    expect(strip).toEqual({
      id: 's', type: 'flight', currentBayId: 'x', createdAt: T0, lastMovedAt: T0, flightKind: 'other',
      callsign: 'NAX22', aircraftType: '', route: '', requestedAltitude: '', clearedAltitude: '',
      squawk: '4711', remarks: '',
    })
    expect(s.boards.b.bays.x.stripOrder).toEqual(['s'])
  })

  it('creates info and vehicle strips from a quick value', () => {
    const b = fixture().boards.b
    expect(b.strips.s3).toMatchObject({ type: 'info', message: 'Turb FL300', notes: '' })
    expect(b.strips.s4).toMatchObject({ type: 'vehicle', vehicleId: 'Follow-me 2', notes: '' })
    expect(b.bays.x.stripOrder).toEqual(['s1', 's2', 's3'])
    assertInvariants(b)
  })

  it('ignores blank quick values and non-quick types', () => {
    const s0 = fixture()
    expect(run(s0, A.createQuickStrip('b', 'x', 'info', '   ', 'n'))).toBe(s0)
    expect(run(s0, A.createQuickStrip('b', 'x', 'flight', 'SAS1', 'n'))).toBe(s0)
  })

  it('ignores creation into a missing bay', () => {
    const s0 = fixture()
    expect(run(s0, A.createFlightStrip('b', 'nope', { callsign: 'X' }, 'n'))).toBe(s0)
  })
})

describe('strip edit / delete', () => {
  it('merges a patch but protects structural fields', () => {
    const s = run(fixture(), A.updateStrip('b', 's3', { notes: 'hi', colorOverride: '#f00', currentBayId: 'z', type: 'flight' }))
    expect(s.boards.b.strips.s3).toMatchObject({ notes: 'hi', colorOverride: '#f00', currentBayId: 'x', type: 'info' })
  })

  it('deletes a strip from its bay', () => {
    const s = run(fixture(), A.deleteStrip('b', 's2'))
    expect(s.boards.b.bays.x.stripOrder).toEqual(['s1', 's3'])
    expect(s.boards.b.strips.s2).toBeUndefined()
    assertInvariants(s.boards.b)
  })
})

describe('moveStrip', () => {
  it('reorders within a bay, downwards', () => {
    const s = run(fixture(), A.moveStrip('b', 's1', 'x', 2))
    expect(s.boards.b.bays.x.stripOrder).toEqual(['s2', 's3', 's1'])
    assertInvariants(s.boards.b)
  })

  it('reorders within a bay, upwards', () => {
    const s = run(fixture(), A.moveStrip('b', 's3', 'x', 0))
    expect(s.boards.b.bays.x.stripOrder).toEqual(['s3', 's1', 's2'])
  })

  it('is a no-op when nothing changes', () => {
    const s0 = fixture()
    expect(run(s0, A.moveStrip('b', 's2', 'x', 1))).toBe(s0)
  })

  it('does not touch lastMovedAt on a same-bay reorder', () => {
    const s = run(fixture(), { ...A.moveStrip('b', 's1', 'x', 2), movedAt: T1 })
    expect(s.boards.b.strips.s1.lastMovedAt).toBe(T0)
  })

  it('moves to another bay at an index and stamps lastMovedAt', () => {
    const s = run(fixture(), { ...A.moveStrip('b', 's1', 'y', 0), movedAt: T1 })
    const b = s.boards.b
    expect(b.bays.x.stripOrder).toEqual(['s2', 's3'])
    expect(b.bays.y.stripOrder).toEqual(['s1', 's4'])
    expect(b.strips.s1).toMatchObject({ currentBayId: 'y', lastMovedAt: T1 })
    assertInvariants(b)
  })

  it('leaves lastMovedAt alone when markMoved is false', () => {
    const s = run(fixture(), A.moveStrip('b', 's1', 'y', 0, { markMoved: false }))
    expect(s.boards.b.strips.s1).toMatchObject({ currentBayId: 'y', lastMovedAt: T0 })
  })

  it('appends when index is omitted or too large', () => {
    let s = run(fixture(), A.moveStrip('b', 's1', 'y'))
    expect(s.boards.b.bays.y.stripOrder).toEqual(['s4', 's1'])
    s = run(fixture(), A.moveStrip('b', 's1', 'y', 99))
    expect(s.boards.b.bays.y.stripOrder).toEqual(['s4', 's1'])
  })

  it('moves into an empty bay', () => {
    const s = run(fixture(), A.moveStrip('b', 's4', 'z', 0))
    expect(s.boards.b.bays.y.stripOrder).toEqual([])
    expect(s.boards.b.bays.z.stripOrder).toEqual(['s4'])
    assertInvariants(s.boards.b)
  })

  it('ignores unknown strip or bay', () => {
    const s0 = fixture()
    expect(run(s0, A.moveStrip('b', 'nope', 'z', 0))).toBe(s0)
    expect(run(s0, A.moveStrip('b', 's1', 'nope', 0))).toBe(s0)
  })
})

describe('settings', () => {
  it('toggles keepScreenOn', () => {
    const s0 = initialState({ boardId: 'b' })
    const s1 = run(s0, A.setKeepScreenOn(true))
    expect(s1.settings.keepScreenOn).toBe(true)
    expect(run(s1, A.setKeepScreenOn(true))).toBe(s1)
    expect(run(s1, A.setKeepScreenOn(false)).settings.keepScreenOn).toBe(false)
  })
})

describe('import / restore', () => {
  it('importBoard adds a sanitized copy under a new id and activates it', () => {
    const src = fixture().boards.b
    const s = run(initialState({ boardId: 'b' }), A.importBoard(src, 'imp'))
    expect(s.boardOrder).toEqual(['b', 'imp'])
    expect(s.activeBoardId).toBe('imp')
    expect(s.boards.imp.name).toBe('Board 1 (2)') // name clash resolved
    expect(s.boards.imp.bayOrder).toEqual(['x', 'y', 'z'])
    expect(Object.keys(s.boards.imp.strips).sort()).toEqual(['s1', 's2', 's3', 's4'])
    assertInvariants(s.boards.imp)
  })

  it('sanitizeBoard drops dangling and unknown data', () => {
    const b = sanitizeBoard(
      {
        name: ' Messy ',
        bayOrder: ['x', 'ghost', 'x'],
        bays: { x: { name: 'X', stripOrder: ['s1', 'nope', 's2', 's3'], color: '#123' }, orphan: { name: 'O' } },
        strips: {
          s1: { type: 'flight', callsign: 'SAS1', squawk: 1234, evil: 'x' },
          s2: { type: 'alien', callsign: 'Z' },
          s3: { type: 'info', message: '' },
        },
      },
      'id',
    )
    expect(b.name).toBe('Messy')
    expect(b.bayOrder).toEqual(['x'])
    expect(b.bays.x).toMatchObject({ name: 'X', color: '#123', stripOrder: ['s1'] })
    expect(b.strips.s1).toMatchObject({ type: 'flight', callsign: 'SAS1', squawk: '', currentBayId: 'x' })
    expect(b.strips.s1.evil).toBeUndefined()
    assertInvariants(b)
  })

  it('sanitizeBoard rejects garbage', () => {
    expect(sanitizeBoard(null, 'id')).toBeNull()
    expect(sanitizeBoard('str', 'id')).toBeNull()
    expect(sanitizeBoard({}, 'id')).toMatchObject({ bayOrder: [], strips: {} })
  })

  it('restoreStrip puts a deleted strip back at its index', () => {
    const s0 = fixture()
    const strip = s0.boards.b.strips.s2
    const s1 = run(s0, A.deleteStrip('b', 's2'))
    const s2 = run(s1, A.restoreStrip('b', strip, 1))
    expect(s2.boards.b.bays.x.stripOrder).toEqual(['s1', 's2', 's3'])
    expect(run(s2, A.restoreStrip('b', strip, 1))).toBe(s2) // idempotent
    assertInvariants(s2.boards.b)
  })

  it('restoreBay puts a deleted bay and its strips back', () => {
    const s0 = fixture()
    const bay = s0.boards.b.bays.x
    const strips = s0.boards.b.strips
    const s1 = run(s0, A.deleteBay('b', 'x'))
    const s2 = run(s1, A.restoreBay('b', bay, strips, 0))
    expect(s2.boards.b.bayOrder).toEqual(['x', 'y', 'z'])
    expect(s2.boards.b.bays.x.stripOrder).toEqual(['s1', 's2', 's3'])
    assertInvariants(s2.boards.b)
  })

  it('restoreBoard puts a deleted board back at its index', () => {
    const s0 = run(fixture(), A.createBoard('B2', 'b2'))
    const board = s0.boards.b
    const s1 = run(s0, A.deleteBoard('b', 'r'))
    const s2 = run(s1, A.restoreBoard(board, 0))
    expect(s2.boardOrder).toEqual(['b', 'b2'])
    expect(s2.activeBoardId).toBe('b')
    assertInvariants(s2.boards.b)
  })
})

describe('flightKind', () => {
  it('is stored when valid and defaults to other', () => {
    let s = run(fixture(), A.createFlightStrip('b', 'x', { callsign: 'A1', flightKind: 'arrival' }, 'a', T0))
    expect(s.boards.b.strips.a.flightKind).toBe('arrival')
    s = run(s, A.createFlightStrip('b', 'x', { callsign: 'A2', flightKind: 'bogus' }, 'a2', T0))
    expect(s.boards.b.strips.a2.flightKind).toBe('other')
  })

  it('updateStrip normalises it and ignores it on non-flight strips', () => {
    let s = run(fixture(), A.updateStrip('b', 's1', { flightKind: 'departure' }))
    expect(s.boards.b.strips.s1.flightKind).toBe('departure')
    s = run(s, A.updateStrip('b', 's1', { flightKind: 'nope' }))
    expect(s.boards.b.strips.s1.flightKind).toBe('other')
    s = run(s, A.updateStrip('b', 's3', { flightKind: 'arrival', notes: 'n' }))
    expect(s.boards.b.strips.s3.flightKind).toBeUndefined()
    expect(s.boards.b.strips.s3.notes).toBe('n')
  })

  it('sanitizeBoard defaults missing/invalid kinds (old data → other)', () => {
    const b = sanitizeBoard(
      {
        bayOrder: ['x'],
        bays: { x: { name: 'X', stripOrder: ['old', 'arr', 'bad'] } },
        strips: {
          old: { type: 'flight', callsign: 'OLD1' },
          arr: { type: 'flight', callsign: 'ARR1', flightKind: 'arrival' },
          bad: { type: 'flight', callsign: 'BAD1', flightKind: 42 },
        },
      },
      'id',
    )
    expect(b.strips.old.flightKind).toBe('other')
    expect(b.strips.arr.flightKind).toBe('arrival')
    expect(b.strips.bad.flightKind).toBe('other')
  })
})

describe('archive', () => {
  const labels = (b) => b.archive.map((e) => e.strip.callsign ?? e.strip.vehicleId ?? e.strip.message)

  it('removing a strip archives a snapshot with bay name and time', () => {
    const s = run(fixture(), A.deleteStrip('b', 's1', T1))
    const b = s.boards.b
    expect(b.strips.s1).toBeUndefined()
    expect(b.archive).toHaveLength(1)
    expect(b.archive[0]).toMatchObject({
      entryId: `s1:${T1}`, archivedAt: T1, fromBayId: 'x', fromBayName: 'X',
      strip: { id: 's1', callsign: 'SAS1', createdAt: T0 },
    })
    assertInvariants(b)
  })

  it('newest entries come first', () => {
    const s = run(fixture(), A.deleteStrip('b', 's1', T0), A.deleteStrip('b', 's2', T1))
    expect(labels(s.boards.b)).toEqual(['SAS2', 'SAS1'])
  })

  it('deleting a bay archives its strips in order with the bay name', () => {
    const s = run(fixture(), A.deleteBay('b', 'x', T1))
    const b = s.boards.b
    expect(labels(b)).toEqual(['SAS1', 'SAS2', 'Turb FL300'])
    expect(b.archive.every((e) => e.fromBayName === 'X' && e.archivedAt === T1)).toBe(true)
  })

  it('undo (restoreStrip) removes the newest matching entry only', () => {
    const s0 = fixture()
    const strip = s0.boards.b.strips.s1
    let s = run(s0, A.deleteStrip('b', 's1', T0), A.restoreStrip('b', strip, 0), A.deleteStrip('b', 's1', T1))
    expect(s.boards.b.archive.map((e) => e.archivedAt)).toEqual([T1])
    s = run(s, A.restoreStrip('b', strip, 0))
    expect(s.boards.b.archive).toEqual([])
  })

  it('undo (restoreBay) removes the entries of its strips', () => {
    const s0 = fixture()
    const bay = s0.boards.b.bays.x
    const strips = s0.boards.b.strips
    const s = run(s0, A.deleteBay('b', 'x', T1), A.restoreBay('b', bay, strips, 0))
    expect(s.boards.b.archive).toEqual([])
    assertInvariants(s.boards.b)
  })

  it('restoreFromArchive puts the strip at the end of the chosen bay and drops the entry', () => {
    let s = run(fixture(), A.deleteStrip('b', 's1', T0))
    s = run(s, A.restoreFromArchive('b', `s1:${T0}`, 'y', 'newid', T1))
    const b = s.boards.b
    expect(b.bays.y.stripOrder).toEqual(['s4', 's1'])
    expect(b.strips.s1).toMatchObject({ currentBayId: 'y', lastMovedAt: T1, createdAt: T0, callsign: 'SAS1' })
    expect(b.archive).toEqual([])
    assertInvariants(b)
  })

  it('restoreFromArchive uses a fresh id when the original is taken', () => {
    let s = run(fixture(), A.deleteStrip('b', 's1', T0))
    // a new strip re-uses id s1 meanwhile
    s = run(s, A.createFlightStrip('b', 'z', { callsign: 'NEW' }, 's1', T1))
    s = run(s, A.restoreFromArchive('b', `s1:${T0}`, 'y', 'fresh', T1))
    expect(s.boards.b.strips.fresh).toMatchObject({ callsign: 'SAS1', currentBayId: 'y' })
    expect(s.boards.b.strips.s1.callsign).toBe('NEW')
    assertInvariants(s.boards.b)
  })

  it('restoreFromArchive is a no-op for unknown entry or bay', () => {
    const s0 = run(fixture(), A.deleteStrip('b', 's1', T0))
    expect(run(s0, A.restoreFromArchive('b', 'nope', 'y', 'n', T1))).toBe(s0)
    expect(run(s0, A.restoreFromArchive('b', `s1:${T0}`, 'nope', 'n', T1))).toBe(s0)
  })

  it('clearArchive empties it', () => {
    const s = run(fixture(), A.deleteStrip('b', 's1', T0), A.clearArchive('b'))
    expect(s.boards.b.archive).toEqual([])
    expect(run(s, A.clearArchive('b'))).toBe(s)
  })

  it('caps at ARCHIVE_LIMIT, dropping the oldest', () => {
    let s = run(initialState({ boardId: 'b' }), A.addBay('b', 'X', 'x'))
    for (let i = 0; i < ARCHIVE_LIMIT + 5; i++) {
      s = run(s, A.createQuickStrip('b', 'x', 'info', `m${i}`, `q${i}`, T0), A.deleteStrip('b', `q${i}`, T0))
    }
    const b = s.boards.b
    expect(b.archive).toHaveLength(ARCHIVE_LIMIT)
    expect(b.archive[0].strip.message).toBe(`m${ARCHIVE_LIMIT + 4}`)
    expect(b.archive.at(-1).strip.message).toBe('m5')
  })

  it('survives sanitizeBoard (import) and drops malformed entries', () => {
    const src = run(fixture(), A.deleteStrip('b', 's1', T0), A.deleteStrip('b', 's4', T1)).boards.b
    const clean = sanitizeBoard(
      { ...src, archive: [...src.archive, { archivedAt: T1, strip: { type: 'flight' } }, 'junk', { strip: src.strips.s2 }] },
      'imp',
    )
    expect(clean.archive).toHaveLength(2)
    expect(clean.archive[0]).toMatchObject({ entryId: `s4:${T1}`, fromBayName: 'Y', strip: { vehicleId: 'Follow-me 2' } })
    expect(sanitizeBoard({ bayOrder: [], bays: {} }, 'x').archive).toEqual([])
  })
})

describe('spanning two bays', () => {
  // fixture bays: x | y | z
  it('spanStrip moves into the left bay and spans into its right neighbour', () => {
    const s = run(fixture(), A.spanStrip('b', 's4', 'x', 1, T1)) // s4 was in y
    const b = s.boards.b
    expect(b.bays.x.stripOrder).toEqual(['s1', 's4', 's2', 's3'])
    expect(b.bays.y.stripOrder).toEqual([])
    expect(b.strips.s4).toMatchObject({ currentBayId: 'x', spanBayId: 'y', lastMovedAt: T1 })
    assertInvariants(b)
  })

  it('spanStrip on the last bay is a plain move (nothing to span into)', () => {
    const s = run(fixture(), A.spanStrip('b', 's1', 'z', null, T1))
    expect(s.boards.b.strips.s1).toMatchObject({ currentBayId: 'z' })
    expect(s.boards.b.strips.s1.spanBayId).toBeUndefined()
  })

  it('spanStrip within the same bay keeps lastMovedAt and is idempotent', () => {
    const s1 = run(fixture(), A.spanStrip('b', 's1', 'x', 0, T1))
    expect(s1.boards.b.strips.s1).toMatchObject({ spanBayId: 'y', lastMovedAt: T0 })
    expect(run(s1, A.spanStrip('b', 's1', 'x', 0, T1))).toBe(s1)
  })

  it('spanWith: right neighbour sets, left neighbour moves left and spans back, null clears', () => {
    let s = run(fixture(), A.spanWith('b', 's1', 'y', T1))
    expect(s.boards.b.strips.s1).toMatchObject({ currentBayId: 'x', spanBayId: 'y' })
    s = run(s, A.spanWith('b', 's1', null))
    expect(s.boards.b.strips.s1.spanBayId).toBeUndefined()
    s = run(s, A.spanWith('b', 's4', 'x', T1)) // s4 in y, x is its left neighbour
    expect(s.boards.b.strips.s4).toMatchObject({ currentBayId: 'x', spanBayId: 'y', lastMovedAt: T1 })
    expect(s.boards.b.bays.x.stripOrder.at(-1)).toBe('s4')
    assertInvariants(s.boards.b)
  })

  it('spanWith ignores non-neighbours', () => {
    const s0 = fixture()
    expect(run(s0, A.spanWith('b', 's1', 'z'))).toBe(s0)
    expect(run(s0, A.spanWith('b', 's1', 'nope'))).toBe(s0)
  })

  it('moveStrip to another bay clears the span; same-bay reorder keeps it', () => {
    let s = run(fixture(), A.spanWith('b', 's1', 'y'))
    s = run(s, A.moveStrip('b', 's1', 'x', 2))
    expect(s.boards.b.strips.s1.spanBayId).toBe('y')
    s = run(s, A.moveStrip('b', 's1', 'z', 0))
    expect(s.boards.b.strips.s1.spanBayId).toBeUndefined()
  })

  it('snaps back when the bays are no longer neighbours', () => {
    const s0 = run(fixture(), A.spanWith('b', 's1', 'y'))
    expect(run(s0, A.reorderBays('b', ['x', 'z', 'y'])).boards.b.strips.s1.spanBayId).toBeUndefined()
    expect(run(s0, A.reorderBays('b', ['z', 'x', 'y'])).boards.b.strips.s1.spanBayId).toBe('y') // still adjacent
    expect(run(s0, A.deleteBay('b', 'y')).boards.b.strips.s1.spanBayId).toBeUndefined()
  })

  it('a spanning strip removed and undone keeps its span if still valid', () => {
    const s0 = run(fixture(), A.spanWith('b', 's1', 'y'))
    const strip = s0.boards.b.strips.s1
    const s1 = run(s0, A.deleteStrip('b', 's1', T1), A.restoreStrip('b', strip, 0))
    expect(s1.boards.b.strips.s1.spanBayId).toBe('y')
    const s2 = run(s0, A.deleteStrip('b', 's1', T1), A.reorderBays('b', ['x', 'z', 'y']), A.restoreStrip('b', strip, 0))
    expect(s2.boards.b.strips.s1.spanBayId).toBeUndefined()
  })

  it('restoreFromArchive drops the span', () => {
    const s0 = run(fixture(), A.spanWith('b', 's1', 'y'), A.deleteStrip('b', 's1', T1))
    const s = run(s0, A.restoreFromArchive('b', `s1:${T1}`, 'x', 'n', T1))
    expect(s.boards.b.strips.s1.spanBayId).toBeUndefined()
  })

  it('sanitizeBoard keeps a valid span and drops an invalid one', () => {
    const src = run(fixture(), A.spanWith('b', 's1', 'y'), A.spanWith('b', 's4', 'z')).boards.b
    const tampered = { ...src, strips: { ...src.strips, s4: { ...src.strips.s4, spanBayId: 'x' } } }
    const clean = sanitizeBoard(tampered, 'imp')
    expect(clean.strips.s1.spanBayId).toBe('y')
    expect(clean.strips.s4.spanBayId).toBeUndefined()
  })
})
