// localStorage persistence, same rules as the strip board: versioned,
// unreadable data moved to a backup key, missing fields default.
export const STORAGE_KEY = 'atc-flow-board'
export const BACKUP_KEY = 'atc-flow-board.backup'
export const SCHEMA_VERSION = 1

function getStore(storage) {
  if (storage) return storage
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function isValid(d) {
  return (
    d && typeof d === 'object' && d.version === SCHEMA_VERSION &&
    d.runways && typeof d.runways === 'object' &&
    Array.isArray(d.runwayOrder) && d.runwayOrder.length > 0 && d.runwayOrder.every((id) => d.runways[id]) &&
    d.tokens && typeof d.tokens === 'object'
  )
}

export function serialize(state) {
  return JSON.stringify({ version: SCHEMA_VERSION, ...state })
}

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
    /* backup below */
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
  if (!state.runways[state.activeRunwayId]) state.activeRunwayId = state.runwayOrder[0]
  state.history = Array.isArray(state.history) ? state.history : []
  state.settings = { sound: true, theme: 'indoor', profile: 'combined', ...(state.settings ?? {}) }
  for (const t of Object.values(state.tokens)) {
    t.events = Array.isArray(t.events) ? t.events : []
    t.timers = Array.isArray(t.timers) ? t.timers : []
    t.permissions = Array.isArray(t.permissions) ? t.permissions : []
    t.circuits = Number.isInteger(t.circuits) ? t.circuits : 0
  }
  return state
}

export function save(state, storage) {
  const store = getStore(storage)
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, serialize(state))
    return true
  } catch {
    return false
  }
}
