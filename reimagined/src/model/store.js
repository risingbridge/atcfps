import { makeId } from '../lib/id.js'
import { defaultRunway, pathFor, placeById, ringOrder, runwayPlaceId } from './template.js'

/**
 * @typedef {'ifr'|'vfr'|'vehicle'|'info'} TokenKind
 * @typedef {'land'|'circuit'|'depart'|'none'} Intent
 *
 * @typedef {Object} Event
 * @property {string} at      ISO
 * @property {string} type    'received'|'move'|'advance'|'back'|'go-around'|'transferred'|'field'|'timer'|'note'|'removed'
 * @property {string} [from]  place id
 * @property {string} [to]    place id
 * @property {string} [detail]
 *
 * @typedef {Object} Token
 * @property {string} id
 * @property {TokenKind} kind
 * @property {Intent} intent
 * @property {string} placeId
 * @property {number} order        position within its place (lower = earlier)
 * @property {string} callsign     vehicle id / message for vehicle / info
 * @property {string} type         aircraft type
 * @property {string} wake
 * @property {string} runway
 * @property {string} stand
 * @property {string} squawk
 * @property {string} clearedLevel
 * @property {string} remarks
 * @property {string[]} permissions  vehicle: area names (+ runway place id)
 * @property {number} circuits
 * @property {{id:string, at:string, label:string}[]} timers
 * @property {string} createdAt
 * @property {string} lastMovedAt
 * @property {Event[]} events
 *
 * @typedef {Object} AppState
 * @property {Record<string, import('./template.js').defaultRunway extends (...a:any)=>infer R ? R : never>} runways
 * @property {string[]} runwayOrder
 * @property {string} activeRunwayId
 * @property {Record<string, Token>} tokens
 * @property {Token[]} history      transferred/removed tokens, newest first
 * @property {{ sound: boolean, theme: 'indoor'|'day'|'night', profile: 'combined'|'tower' }} settings
 */

export const HISTORY_LIMIT = 500
const now = () => new Date().toISOString()

export const TOKEN_KINDS = ['ifr', 'vfr', 'vehicle', 'info']
export const INTENTS = ['land', 'circuit', 'depart', 'none']

const TEXT_FIELDS = ['callsign', 'type', 'wake', 'runway', 'stand', 'squawk', 'clearedLevel', 'remarks', 'eta']

/** "HHMM" or "HH:MM" (UTC) → minutes since midnight, else null. */
export function parseEta(text) {
  const m = /^(\d{2}):?(\d{2})$/.exec(String(text ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

function baseToken(id, kind, placeId, at) {
  return {
    id,
    kind,
    intent: 'none',
    placeId,
    order: 0,
    callsign: '',
    type: '',
    wake: '',
    runway: '',
    stand: '',
    squawk: kind === 'vfr' ? '7000' : '',
    clearedLevel: '',
    remarks: '',
    eta: '',
    permissions: [],
    circuits: 0,
    timers: [],
    createdAt: at,
    lastMovedAt: at,
    events: [],
  }
}

export function initialState({ runwayId = makeId() } = {}) {
  const runway = defaultRunway(runwayId)
  return {
    runways: { [runwayId]: runway },
    runwayOrder: [runwayId],
    activeRunwayId: runwayId,
    tokens: {},
    history: [],
    settings: { sound: true, theme: 'indoor', profile: 'combined' },
  }
}

// ---------------------------------------------------------------------------
// Action creators (ids and timestamps made here; reducer stays pure)

export const actions = {
  /** A new token in a place (default: by kind — inbound / outbound / vehicles / park). */
  createToken: (kind, fields = {}, placeId = null, id = makeId(), at = now()) => ({
    type: 'createToken', kind, fields, placeId, id, at,
  }),
  updateToken: (tokenId, patch, at = now()) => ({ type: 'updateToken', tokenId, patch, at }),
  setIntent: (tokenId, intent) => ({ type: 'setIntent', tokenId, intent }),
  /** Explicit placement (drag): to `placeId` at `index` (null = end). Records a move. */
  moveToken: (tokenId, placeId, index = null, at = now()) => ({ type: 'moveToken', tokenId, placeId, index, at }),
  /** One step forward on the token's path (swipe right). `steps` > 1 skips. */
  advance: (tokenId, steps = 1, at = now()) => ({ type: 'advance', tokenId, steps, at }),
  /** One step back (swipe left); from final/short final/runway on a landing path this is a go-around. */
  back: (tokenId, at = now()) => ({ type: 'back', tokenId, at }),
  goAround: (tokenId, at = now()) => ({ type: 'goAround', tokenId, at }),
  /** Token leaves the board to another position; goes to history with its log. */
  transfer: (tokenId, to = '', at = now()) => ({ type: 'transfer', tokenId, to, at }),
  removeToken: (tokenId, at = now()) => ({ type: 'removeToken', tokenId, at }),
  restoreToken: (token) => ({ type: 'restoreToken', token }),
  addTimer: (tokenId, at, label = '', id = makeId(), createdAt = now()) => ({ type: 'addTimer', tokenId, at, label, id, createdAt }),
  clearTimer: (tokenId, timerId) => ({ type: 'clearTimer', tokenId, timerId }),
  addNote: (tokenId, text, at = now()) => ({ type: 'addNote', tokenId, text, at }),
  setPermissions: (tokenId, permissions, at = now()) => ({ type: 'setPermissions', tokenId, permissions, at }),
  /** Reorder the inbound lane by ETA (tokens without an ETA keep their relative order, after those with one). */
  sortInboundByEta: (at = now()) => ({ type: 'sortInboundByEta', at }),

  flipRunway: (runwayId, at = now()) => ({ type: 'flipRunway', runwayId, at }),
  updateRunway: (runwayId, patch) => ({ type: 'updateRunway', runwayId, patch }),
  setPlaces: (runwayId, places) => ({ type: 'setPlaces', runwayId, places }),
  setSettings: (patch) => ({ type: 'setSettings', patch }),
  replaceState: (state) => ({ type: 'replaceState', state }),
  clearHistory: () => ({ type: 'clearHistory' }),
}

// ---------------------------------------------------------------------------
// Helpers

function active(state) {
  return state.runways[state.activeRunwayId]
}

function defaultPlaceFor(kind) {
  return kind === 'vehicle' ? 'vehicles' : kind === 'info' ? 'park' : kind === 'vfr' ? 'inbound' : 'inbound'
}

function defaultIntentFor(kind, placeId) {
  if (kind === 'vehicle' || kind === 'info') return 'none'
  if (placeId === 'outbound') return 'depart'
  return kind === 'vfr' ? 'circuit' : 'land'
}

function withEvent(token, event) {
  return { ...token, events: [...token.events, event] }
}

/** Tokens in a place, in order. */
export function tokensIn(state, placeId) {
  return Object.values(state.tokens)
    .filter((t) => t.placeId === placeId)
    .sort((a, b) => a.order - b.order)
}

function reindex(tokens, placeId) {
  const inPlace = Object.values(tokens)
    .filter((t) => t.placeId === placeId)
    .sort((a, b) => a.order - b.order)
  const out = { ...tokens }
  inPlace.forEach((t, i) => {
    if (t.order !== i) out[t.id] = { ...t, order: i }
  })
  return out
}

/** Place `token` at `index` (null = end) within `placeId`, reindexing both places. */
function place(tokens, token, placeId, index) {
  const others = Object.values(tokens)
    .filter((t) => t.placeId === placeId && t.id !== token.id)
    .sort((a, b) => a.order - b.order)
  const at = index == null ? others.length : Math.max(0, Math.min(index, others.length))
  const ordered = [...others.slice(0, at), token, ...others.slice(at)]
  let out = { ...tokens }
  ordered.forEach((t, i) => {
    out[t.id] = { ...t, placeId, order: i }
  })
  if (token.placeId !== placeId) out = reindex(out, token.placeId)
  return out
}

function stepOnPath(runway, token, steps) {
  const path = pathFor(runway, token.intent)
  const i = path.indexOf(token.placeId)
  if (i < 0) {
    // a circuit token waiting in the inbound lane joins the circuit on its first advance
    if (token.intent === 'circuit' && token.placeId === 'inbound' && steps > 0) return path[Math.min(steps - 1, path.length - 1)]
    return null
  }
  if (token.intent === 'circuit') return path[(i + steps + path.length * 4) % path.length]
  const j = i + steps
  return j >= 0 && j < path.length ? path[j] : null
}

// ---------------------------------------------------------------------------
// Reducer

export function reducer(state, action) {
  switch (action.type) {
    case 'createToken': {
      if (!TOKEN_KINDS.includes(action.kind)) return state
      const placeId = action.placeId ?? defaultPlaceFor(action.kind)
      if (!placeById(active(state), placeId)) return state
      let token = baseToken(action.id, action.kind, placeId, action.at)
      for (const f of TEXT_FIELDS) if (typeof action.fields[f] === 'string') token[f] = action.fields[f].trim()
      if (action.kind === 'vfr' && !token.squawk) token.squawk = '7000'
      if (Array.isArray(action.fields.permissions)) token.permissions = action.fields.permissions.slice()
      token.intent = INTENTS.includes(action.fields.intent) ? action.fields.intent : defaultIntentFor(action.kind, placeId)
      token = withEvent(token, { at: action.at, type: 'received', to: placeId })
      return { ...state, tokens: place(state.tokens, token, placeId, null) }
    }
    case 'updateToken': {
      const token = state.tokens[action.tokenId]
      if (!token) return state
      let next = { ...token }
      const changed = []
      for (const f of TEXT_FIELDS) {
        if (typeof action.patch[f] === 'string' && action.patch[f].trim() !== token[f]) {
          next[f] = action.patch[f].trim()
          changed.push(`${f}=${next[f]}`)
        }
      }
      if (changed.length === 0) return state
      next = withEvent(next, { at: action.at, type: 'field', detail: changed.join(' ') })
      return { ...state, tokens: { ...state.tokens, [token.id]: next } }
    }
    case 'setIntent': {
      const token = state.tokens[action.tokenId]
      if (!token || !INTENTS.includes(action.intent) || token.intent === action.intent) return state
      return { ...state, tokens: { ...state.tokens, [token.id]: { ...token, intent: action.intent } } }
    }
    case 'moveToken': {
      const token = state.tokens[action.tokenId]
      const runway = active(state)
      if (!token || !placeById(runway, action.placeId)) return state
      if (token.placeId === action.placeId) {
        const count = tokensIn(state, action.placeId).length
        const target = action.index == null ? count - 1 : Math.max(0, Math.min(action.index, count - 1))
        if (target === token.order) return state
      }
      return moveWithEvent(state, token, action.placeId, action.index, 'move', action.at)
    }
    case 'advance': {
      const token = state.tokens[action.tokenId]
      if (!token || token.intent === 'none') return state
      const to = stepOnPath(active(state), token, Math.max(1, action.steps))
      if (!to) return state
      return moveWithEvent(state, token, to, null, 'advance', action.at)
    }
    case 'back': {
      const token = state.tokens[action.tokenId]
      if (!token || token.intent === 'none') return state
      const runway = active(state)
      const rwy = runwayPlaceId(runway)
      const ring = ringOrder(runway)
      const approach = ring.slice(ring.indexOf(runway.joins.land)) // final … runway
      if (token.intent === 'land' && approach.includes(token.placeId)) {
        return goAround(state, token, action.at)
      }
      const to = stepOnPath(runway, token, -1)
      if (!to) return state
      if (token.placeId === rwy && token.intent === 'circuit') return goAround(state, token, action.at)
      return moveWithEvent(state, token, to, null, 'back', action.at)
    }
    case 'goAround': {
      const token = state.tokens[action.tokenId]
      if (!token) return state
      return goAround(state, token, action.at)
    }
    case 'transfer': {
      const token = state.tokens[action.tokenId]
      if (!token) return state
      const done = withEvent(token, { at: action.at, type: 'transferred', from: token.placeId, detail: action.to })
      return leave(state, done)
    }
    case 'removeToken': {
      const token = state.tokens[action.tokenId]
      if (!token) return state
      const done = withEvent(token, { at: action.at, type: 'removed', from: token.placeId })
      return leave(state, done)
    }
    case 'restoreToken': {
      const t = action.token
      if (!t?.id || state.tokens[t.id] || !placeById(active(state), t.placeId)) return state
      const history = state.history.filter((h) => h.id !== t.id)
      return { ...state, history, tokens: place(state.tokens, t, t.placeId, t.order) }
    }
    case 'addTimer': {
      const token = state.tokens[action.tokenId]
      if (!token || typeof action.at !== 'string') return state
      const timers = [...token.timers, { id: action.id, at: action.at, label: action.label ?? '' }]
      const next = withEvent({ ...token, timers }, { at: action.createdAt, type: 'timer', detail: `${action.label || 'timer'} @ ${action.at}` })
      return { ...state, tokens: { ...state.tokens, [token.id]: next } }
    }
    case 'clearTimer': {
      const token = state.tokens[action.tokenId]
      if (!token || !token.timers.some((t) => t.id === action.timerId)) return state
      return { ...state, tokens: { ...state.tokens, [token.id]: { ...token, timers: token.timers.filter((t) => t.id !== action.timerId) } } }
    }
    case 'addNote': {
      const token = state.tokens[action.tokenId]
      const text = typeof action.text === 'string' ? action.text.trim() : ''
      if (!token || !text) return state
      return { ...state, tokens: { ...state.tokens, [token.id]: withEvent(token, { at: action.at, type: 'note', detail: text }) } }
    }
    case 'setPermissions': {
      const token = state.tokens[action.tokenId]
      if (!token || token.kind !== 'vehicle') return state
      const permissions = [...new Set((action.permissions ?? []).filter((p) => typeof p === 'string' && p))]
      const same = permissions.length === token.permissions.length && permissions.every((p) => token.permissions.includes(p))
      if (same) return state
      const next = withEvent({ ...token, permissions }, { at: action.at, type: 'field', detail: `permissions=${permissions.join(',') || 'none'}` })
      return { ...state, tokens: { ...state.tokens, [token.id]: next } }
    }

    case 'sortInboundByEta': {
      const inbound = tokensIn(state, 'inbound')
      const withEta = inbound.filter((t) => parseEta(t.eta) != null).sort((a, b) => parseEta(a.eta) - parseEta(b.eta) || a.order - b.order)
      const without = inbound.filter((t) => parseEta(t.eta) == null)
      const ordered = [...withEta, ...without]
      if (ordered.every((t, i) => t.id === inbound[i].id)) return state
      const tokens = { ...state.tokens }
      ordered.forEach((t, i) => {
        if (t.order !== i) tokens[t.id] = withEvent({ ...t, order: i }, { at: action.at, type: 'move', from: 'inbound', to: 'inbound', detail: 'sorted by ETA' })
      })
      return { ...state, tokens }
    }
    case 'flipRunway': {
      const r = state.runways[action.runwayId]
      if (!r) return state
      const inUse = r.inUse === r.name ? r.reciprocal : r.name
      return { ...state, runways: { ...state.runways, [r.id]: { ...r, inUse } } }
    }
    case 'updateRunway': {
      const r = state.runways[action.runwayId]
      if (!r) return state
      const { id: _i, places: _p, ...patch } = action.patch ?? {}
      return { ...state, runways: { ...state.runways, [r.id]: { ...r, ...patch } } }
    }
    case 'setPlaces': {
      const r = state.runways[action.runwayId]
      if (!r || !Array.isArray(action.places)) return state
      const places = sanitizePlaces(action.places)
      if (!places) return state
      // tokens in a place that disappeared go to park
      let tokens = state.tokens
      for (const t of Object.values(state.tokens)) {
        if (!places.some((p) => p.id === t.placeId)) tokens = place(tokens, { ...t, placeId: 'park' }, 'park', null)
      }
      return { ...state, runways: { ...state.runways, [r.id]: { ...r, places } }, tokens }
    }
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...(action.patch ?? {}) } }
    case 'replaceState':
      return action.state && action.state.tokens ? action.state : state
    case 'clearHistory':
      return state.history.length ? { ...state, history: [] } : state
    default:
      return state
  }
}

function moveWithEvent(state, token, placeId, index, type, at) {
  const runway = active(state)
  const rwy = runwayPlaceId(runway)
  let next = withEvent(token, { at, type, from: token.placeId, to: placeId })
  if (token.placeId !== placeId) {
    next.lastMovedAt = at
    // leaving the runway back into the ring = one more circuit (touch-and-go or go-around)
    if (token.placeId === rwy && ringOrder(runway).includes(placeId)) next = { ...next, circuits: next.circuits + 1 }
  }
  return { ...state, tokens: place(state.tokens, next, placeId, index) }
}

function goAround(state, token, at) {
  const runway = active(state)
  const airborne = ringOrder(runway)[0]
  let next = withEvent(token, { at, type: 'go-around', from: token.placeId, to: airborne })
  next.lastMovedAt = at
  if (token.placeId === runwayPlaceId(runway)) next.circuits += 1
  // after a go-around it flies the circuit to rejoin, whatever it intended before
  if (next.intent === 'land') next.intent = 'circuit'
  return { ...state, tokens: place(state.tokens, next, airborne, null) }
}

function leave(state, done) {
  const { [done.id]: _gone, ...rest } = state.tokens
  const tokens = reindex(rest, done.placeId)
  return { ...state, tokens, history: [done, ...state.history].slice(0, HISTORY_LIMIT) }
}

/** Places: unique string ids, names, known kinds, exactly one runway. Null if unusable. */
export function sanitizePlaces(list) {
  const seen = new Set()
  const out = []
  for (const raw of list) {
    if (!raw || typeof raw.id !== 'string' || !raw.id || seen.has(raw.id)) continue
    const kind = ['lane', 'dep', 'ring', 'runway', 'exit'].includes(raw.kind) ? raw.kind : 'ring'
    seen.add(raw.id)
    out.push({ id: raw.id, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : raw.id, kind })
  }
  if (out.filter((p) => p.kind === 'runway').length !== 1) return null
  for (const lane of ['inbound', 'outbound', 'park', 'vehicles']) if (!seen.has(lane)) return null
  return out
}

// ---------------------------------------------------------------------------
// Selectors

/**
 * Landing sequence: everything heading for the runway (intent land or
 * circuit, not yet on/after the runway), closest first: ring places in
 * order of progress toward the runway, then the inbound lane in its order.
 */
export function landingSequence(state) {
  const runway = active(state)
  const ring = ringOrder(runway)
  const rwy = runwayPlaceId(runway)
  const rank = (t) => {
    if (t.placeId === 'inbound') return 1000 + t.order
    const i = ring.indexOf(t.placeId)
    if (i < 0 || t.placeId === rwy) return null
    // higher index = closer to the runway → lower rank; within a place keep order
    return (ring.length - i) * 100 + t.order
  }
  return Object.values(state.tokens)
    .filter((t) => (t.intent === 'land' || t.intent === 'circuit') && rank(t) != null)
    .map((t) => ({ token: t, rank: rank(t) }))
    .sort((a, b) => a.rank - b.rank)
    .map((x, i) => ({ id: x.token.id, number: i + 1 }))
}

/** Departure sequence: line up, then holding point, then outbound, each in order. */
export function departureSequence(state) {
  const runway = active(state)
  const steps = ['outbound', ...runway.places.filter((p) => p.kind === 'dep').map((p) => p.id)].reverse()
  const rank = (t) => {
    const i = steps.indexOf(t.placeId)
    return i < 0 ? null : i * 100 + t.order
  }
  return Object.values(state.tokens)
    .filter((t) => t.intent === 'depart' && rank(t) != null)
    .sort((a, b) => rank(a) - rank(b))
    .map((t, i) => ({ id: t.id, number: i + 1 }))
}

/** Who is on the runway right now: tokens in the runway place plus vehicles with runway permission. */
export function onRunway(state) {
  const runway = active(state)
  const rwy = runwayPlaceId(runway)
  return Object.values(state.tokens).filter(
    (t) => t.placeId === rwy || (t.kind === 'vehicle' && t.permissions.includes(rwy)),
  )
}

/** Tokens on short final (the last ring place before the runway). */
export function onShortFinal(state) {
  const ring = ringOrder(active(state))
  const last = ring[ring.length - 2]
  return Object.values(state.tokens).filter((t) => t.placeId === last)
}

/**
 * Attention: what needs the controller's eyes. Each alert: { id, level: 'alarm'|'warn', text, tokenIds }.
 * `now` in ms.
 */
export function alerts(state, nowMs = Date.now()) {
  const out = []
  const runway = active(state)
  const occupants = onRunway(state)
  const shortFinal = onShortFinal(state)
  if (occupants.length > 1) {
    out.push({ id: 'occupancy', level: 'alarm', text: `${occupants.length} on runway`, tokenIds: occupants.map((t) => t.id) })
  }
  if (occupants.length >= 1 && shortFinal.length >= 1) {
    out.push({ id: 'short-final', level: 'alarm', text: 'Runway occupied, traffic on short final', tokenIds: [...occupants, ...shortFinal].map((t) => t.id) })
  }
  const ring = ringOrder(runway)
  const onFinal = Object.values(state.tokens).filter((t) => ring.slice(ring.indexOf(runway.joins.land), -1).includes(t.placeId))
  const vehiclesOnRwy = occupants.filter((t) => t.kind === 'vehicle')
  if (vehiclesOnRwy.length && onFinal.length && occupants.length <= 1) {
    out.push({ id: 'vehicle-final', level: 'warn', text: 'Vehicle on runway, traffic on final', tokenIds: [...vehiclesOnRwy, ...onFinal].map((t) => t.id) })
  }
  for (const t of Object.values(state.tokens)) {
    // a transition that skipped a step on its path (e.g. final → runway without short final)
    const last = t.events[t.events.length - 1]
    if (last && (last.type === 'advance' || last.type === 'move') && last.from && last.to && t.intent !== 'none') {
      const path = pathFor(runway, t.intent)
      const a = path.indexOf(last.from)
      const b = path.indexOf(last.to)
      const skipped = a >= 0 && b >= 0 ? (t.intent === 'circuit' ? (b - a + path.length) % path.length : b - a) : 0
      if (skipped > 1) {
        const missed = t.intent === 'circuit' ? path.slice(a + 1, a + skipped) : path.slice(a + 1, b)
        out.push({ id: `skipped:${t.id}`, level: 'warn', text: `${t.callsign || t.kind} skipped ${missed.map((id) => placeById(runway, id)?.name ?? id).join(', ')}`, tokenIds: [t.id] })
      }
    }
    const limit = runway.staleAfter?.[t.placeId]
    if (limit && nowMs - Date.parse(t.lastMovedAt) > limit * 60_000) {
      out.push({ id: `stale:${t.id}`, level: 'warn', text: `${t.callsign || t.kind} ${limit}+ min in ${placeById(runway, t.placeId)?.name}`, tokenIds: [t.id] })
    }
    for (const timer of t.timers) {
      if (Date.parse(timer.at) <= nowMs) {
        out.push({ id: `timer:${timer.id}`, level: 'warn', text: `${t.callsign || t.kind}: ${timer.label || 'timer'} due`, tokenIds: [t.id] })
      }
    }
  }
  return out
}
