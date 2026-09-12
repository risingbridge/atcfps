// localStorage persistence for the whole AppState.
//
// Stored shape: { version, boards, boardOrder, activeBoardId, settings }.
// Anything unreadable (parse error, wrong version, broken shape) is moved to
// a backup key rather than discarded, and load() returns null so the caller
// starts fresh.

export const STORAGE_KEY = 'atc-strip-board'
export const BACKUP_KEY = 'atc-strip-board.backup'
export const SCHEMA_VERSION = 1

function getStore(storage) {
  if (storage) return storage
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // access can throw (e.g. blocked storage)
  }
}

function isValid(data) {
  if (!data || typeof data !== 'object') return false
  if (data.version !== SCHEMA_VERSION) return false
  if (!data.boards || typeof data.boards !== 'object') return false
  if (!Array.isArray(data.boardOrder) || data.boardOrder.length === 0) return false
  if (!data.boardOrder.every((id) => data.boards[id])) return false
  return true
}

/** @returns {import('../state/store.js').AppState | null} */
export function load(storage) {
  const store = getStore(storage)
  if (!store) return null
  let raw
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (raw == null) return null

  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    /* fall through to backup */
  }
  if (!isValid(data)) {
    try {
      store.setItem(BACKUP_KEY, raw)
      store.removeItem(STORAGE_KEY)
    } catch {
      /* best effort */
    }
    return null
  }

  const { version: _v, ...state } = data
  if (!state.boards[state.activeBoardId]) state.activeBoardId = state.boardOrder[0]
  state.settings = { keepScreenOn: false, ...(state.settings ?? {}) }
  return state
}

/** The exact string save() writes for `state`. */
export function serialize(state) {
  return JSON.stringify({ version: SCHEMA_VERSION, ...state })
}

/** @param {import('../state/store.js').AppState} state */
export function save(state, storage) {
  const store = getStore(storage)
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, serialize(state))
    return true
  } catch {
    return false // quota exceeded / private mode
  }
}
