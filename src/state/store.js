import { makeId } from '../lib/id.js'
import { FLIGHT_FIELDS, getStripType } from '../lib/stripTypes.js'

/**
 * @typedef {Object} Strip
 * @property {string} id
 * @property {'flight'|'info'|'vehicle'} type
 * @property {string} currentBayId
 * @property {string} createdAt   ISO timestamp
 * @property {string} lastMovedAt ISO timestamp
 * @property {string} [colorOverride]
 * // flight: callsign, aircraftType, route, requestedAltitude, clearedAltitude, squawk, remarks
 * // info:   message, notes
 * // vehicle: vehicleId, notes
 *
 * @typedef {Object} Bay
 * @property {string} id
 * @property {string} name
 * @property {string} [color]
 * @property {string[]} stripOrder
 *
 * @typedef {Object} Board
 * @property {string} id
 * @property {string} name
 * @property {string[]} bayOrder
 * @property {Record<string, Bay>} bays
 * @property {Record<string, Strip>} strips
 *
 * @typedef {Object} AppState
 * @property {Record<string, Board>} boards
 * @property {string[]} boardOrder
 * @property {string} activeBoardId
 * @property {{ keepScreenOn: boolean }} settings
 */

const DEFAULT_BOARD_NAME = 'Board 1'

const now = () => new Date().toISOString()

function newBoard(id, name) {
  return { id, name, bayOrder: [], bays: {}, strips: {} }
}

/** @returns {AppState} */
export function initialState({ boardId = makeId() } = {}) {
  return {
    boards: { [boardId]: newBoard(boardId, DEFAULT_BOARD_NAME) },
    boardOrder: [boardId],
    activeBoardId: boardId,
    settings: { keepScreenOn: false },
  }
}

// ---------------------------------------------------------------------------
// Action creators. IDs and timestamps are generated here, not in the reducer,
// so the reducer stays pure and tests can pass fixed values.

export const actions = {
  createBoard: (name, id = makeId()) => ({ type: 'createBoard', id, name }),
  deleteBoard: (id, replacementId = makeId()) => ({ type: 'deleteBoard', id, replacementId }),
  renameBoard: (id, name) => ({ type: 'renameBoard', id, name }),
  setActiveBoard: (id) => ({ type: 'setActiveBoard', id }),

  addBay: (boardId, name, id = makeId()) => ({ type: 'addBay', boardId, id, name }),
  renameBay: (boardId, bayId, name) => ({ type: 'renameBay', boardId, bayId, name }),
  setBayColor: (boardId, bayId, color) => ({ type: 'setBayColor', boardId, bayId, color }),
  reorderBays: (boardId, newBayOrder) => ({ type: 'reorderBays', boardId, newBayOrder }),
  deleteBay: (boardId, bayId) => ({ type: 'deleteBay', boardId, bayId }),

  createFlightStrip: (boardId, bayId, fields, id = makeId(), at = now()) => ({
    type: 'createFlightStrip', boardId, bayId, fields, id, at,
  }),
  createQuickStrip: (boardId, bayId, stripType, quickValue, id = makeId(), at = now()) => ({
    type: 'createQuickStrip', boardId, bayId, stripType, quickValue, id, at,
  }),
  updateStrip: (boardId, stripId, patch) => ({ type: 'updateStrip', boardId, stripId, patch }),
  deleteStrip: (boardId, stripId) => ({ type: 'deleteStrip', boardId, stripId }),
  /**
   * Move a strip to `targetIndex` within `targetBayId`. The index is relative
   * to the target list *without* the moved strip (dnd-kit arrayMove semantics).
   * Omit/null index to append. `markMoved: false` leaves lastMovedAt alone —
   * used for the transient moves dispatched during a drag.
   */
  moveStrip: (boardId, stripId, targetBayId, targetIndex = null, { markMoved = true } = {}) => ({
    type: 'moveStrip', boardId, stripId, targetBayId, targetIndex, movedAt: markMoved ? now() : null,
  }),

  setKeepScreenOn: (value) => ({ type: 'setKeepScreenOn', value }),
}

// ---------------------------------------------------------------------------
// Reducer

function updateBoard(state, boardId, fn) {
  const board = state.boards[boardId]
  if (!board) return state
  const next = fn(board)
  if (next === board) return state
  return { ...state, boards: { ...state.boards, [boardId]: next } }
}

function cleanName(name) {
  return typeof name === 'string' ? name.trim() : ''
}

function withoutKey(obj, key) {
  const { [key]: _removed, ...rest } = obj
  return rest
}

function pick(obj, keys) {
  const out = {}
  for (const k of keys) out[k] = typeof obj?.[k] === 'string' ? obj[k] : ''
  return out
}

function insertStrip(board, strip) {
  const bay = board.bays[strip.currentBayId]
  if (!bay) return board
  return {
    ...board,
    strips: { ...board.strips, [strip.id]: strip },
    bays: { ...board.bays, [bay.id]: { ...bay, stripOrder: [...bay.stripOrder, strip.id] } },
  }
}

/** @param {AppState} state */
export function reducer(state, action) {
  switch (action.type) {
    // ----- boards -----
    case 'createBoard': {
      const name = cleanName(action.name) || `Board ${state.boardOrder.length + 1}`
      return {
        ...state,
        boards: { ...state.boards, [action.id]: newBoard(action.id, name) },
        boardOrder: [...state.boardOrder, action.id],
        activeBoardId: action.id,
      }
    }
    case 'deleteBoard': {
      if (!state.boards[action.id]) return state
      const idx = state.boardOrder.indexOf(action.id)
      let boards = withoutKey(state.boards, action.id)
      let boardOrder = state.boardOrder.filter((id) => id !== action.id)
      if (boardOrder.length === 0) {
        boards = { [action.replacementId]: newBoard(action.replacementId, DEFAULT_BOARD_NAME) }
        boardOrder = [action.replacementId]
      }
      const activeBoardId =
        state.activeBoardId === action.id
          ? boardOrder[Math.min(Math.max(idx - 1, 0), boardOrder.length - 1)]
          : state.activeBoardId
      return { ...state, boards, boardOrder, activeBoardId }
    }
    case 'renameBoard': {
      const name = cleanName(action.name)
      if (!name) return state
      return updateBoard(state, action.id, (b) => ({ ...b, name }))
    }
    case 'setActiveBoard':
      if (!state.boards[action.id] || state.activeBoardId === action.id) return state
      return { ...state, activeBoardId: action.id }

    // ----- bays -----
    case 'addBay':
      return updateBoard(state, action.boardId, (b) => {
        const name = cleanName(action.name) || `Bay ${b.bayOrder.length + 1}`
        return {
          ...b,
          bays: { ...b.bays, [action.id]: { id: action.id, name, stripOrder: [] } },
          bayOrder: [...b.bayOrder, action.id],
        }
      })
    case 'renameBay': {
      const name = cleanName(action.name)
      if (!name) return state
      return updateBoard(state, action.boardId, (b) => {
        const bay = b.bays[action.bayId]
        if (!bay) return b
        return { ...b, bays: { ...b.bays, [bay.id]: { ...bay, name } } }
      })
    }
    case 'setBayColor':
      return updateBoard(state, action.boardId, (b) => {
        const bay = b.bays[action.bayId]
        if (!bay) return b
        const next = { ...bay }
        if (action.color) next.color = action.color
        else delete next.color
        return { ...b, bays: { ...b.bays, [bay.id]: next } }
      })
    case 'reorderBays':
      return updateBoard(state, action.boardId, (b) => {
        const next = action.newBayOrder
        const same = next.length === b.bayOrder.length && next.every((id) => b.bays[id])
        const unique = new Set(next).size === next.length
        if (!same || !unique) return b
        return { ...b, bayOrder: [...next] }
      })
    case 'deleteBay':
      return updateBoard(state, action.boardId, (b) => {
        const bay = b.bays[action.bayId]
        if (!bay) return b
        const strips = { ...b.strips }
        for (const id of bay.stripOrder) delete strips[id]
        return {
          ...b,
          bays: withoutKey(b.bays, bay.id),
          bayOrder: b.bayOrder.filter((id) => id !== bay.id),
          strips,
        }
      })

    // ----- strips -----
    case 'createFlightStrip':
      return updateBoard(state, action.boardId, (b) =>
        insertStrip(b, {
          id: action.id,
          type: 'flight',
          currentBayId: action.bayId,
          createdAt: action.at,
          lastMovedAt: action.at,
          ...pick(action.fields, FLIGHT_FIELDS),
        }),
      )
    case 'createQuickStrip': {
      const def = getStripType(action.stripType)
      if (!def.quickAdd) return state
      const value = cleanName(action.quickValue)
      if (!value) return state
      return updateBoard(state, action.boardId, (b) =>
        insertStrip(b, {
          id: action.id,
          type: def.key,
          currentBayId: action.bayId,
          createdAt: action.at,
          lastMovedAt: action.at,
          [def.quickField]: value,
          notes: '',
        }),
      )
    }
    case 'updateStrip':
      return updateBoard(state, action.boardId, (b) => {
        const strip = b.strips[action.stripId]
        if (!strip) return b
        // Structural fields are owned by other actions.
        const { id: _i, type: _t, currentBayId: _c, createdAt: _a, ...patch } = action.patch ?? {}
        return { ...b, strips: { ...b.strips, [strip.id]: { ...strip, ...patch } } }
      })
    case 'deleteStrip':
      return updateBoard(state, action.boardId, (b) => {
        const strip = b.strips[action.stripId]
        if (!strip) return b
        const bay = b.bays[strip.currentBayId]
        const bays = bay
          ? { ...b.bays, [bay.id]: { ...bay, stripOrder: bay.stripOrder.filter((id) => id !== strip.id) } }
          : b.bays
        return { ...b, bays, strips: withoutKey(b.strips, strip.id) }
      })
    case 'moveStrip':
      return updateBoard(state, action.boardId, (b) => {
        const strip = b.strips[action.stripId]
        const target = b.bays[action.targetBayId]
        if (!strip || !target) return b
        const source = b.bays[strip.currentBayId]
        const bays = { ...b.bays }

        const sourceOrder = source ? source.stripOrder.filter((id) => id !== strip.id) : null
        if (source) bays[source.id] = { ...source, stripOrder: sourceOrder }

        const base = source?.id === target.id ? sourceOrder : target.stripOrder.filter((id) => id !== strip.id)
        const idx =
          action.targetIndex == null ? base.length : Math.max(0, Math.min(action.targetIndex, base.length))
        const targetOrder = [...base.slice(0, idx), strip.id, ...base.slice(idx)]
        bays[target.id] = { ...bays[target.id], stripOrder: targetOrder }

        const unchanged =
          source?.id === target.id && source.stripOrder.every((id, i) => id === targetOrder[i])
        if (unchanged) return b

        const nextStrip = { ...strip, currentBayId: target.id }
        if (action.movedAt && strip.currentBayId !== target.id) nextStrip.lastMovedAt = action.movedAt
        return { ...b, bays, strips: { ...b.strips, [strip.id]: nextStrip } }
      })

    // ----- settings -----
    case 'setKeepScreenOn':
      if (state.settings.keepScreenOn === !!action.value) return state
      return { ...state, settings: { ...state.settings, keepScreenOn: !!action.value } }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Selectors / helpers

export function activeBoard(state) {
  return state.boards[state.activeBoardId]
}

/** New bayOrder with `bayId` shifted by `delta` positions, clamped. */
export function shiftInOrder(order, id, delta) {
  const from = order.indexOf(id)
  if (from === -1) return order
  const to = Math.max(0, Math.min(order.length - 1, from + delta))
  if (to === from) return order
  const next = order.filter((x) => x !== id)
  next.splice(to, 0, id)
  return next
}
