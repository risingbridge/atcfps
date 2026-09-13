import { formatZulu } from './time.js'

const EVENT_TEXT = {
  received: (e) => `received → ${e.to}`,
  move: (e) => `${e.from} → ${e.to}${e.detail ? ` (${e.detail})` : ''}`,
  advance: (e) => `${e.from} → ${e.to}`,
  back: (e) => `${e.from} ← ${e.to}`,
  'go-around': (e) => `GO-AROUND from ${e.from}`,
  transferred: (e) => `transferred${e.detail ? ` to ${e.detail}` : ''}`,
  removed: (e) => `removed${e.detail ? ` (${e.detail})` : ''}`,
  field: (e) => e.detail,
  timer: (e) => e.detail,
  note: (e) => e.detail,
}

export function eventText(e) {
  return (EVENT_TEXT[e.type] ?? (() => e.type))(e)
}

/** Every event of every token (live + history), oldest first, as flat rows. */
export function shiftRows(state) {
  const rows = []
  const all = [...state.history, ...Object.values(state.tokens)]
  for (const t of all) {
    const rwy = state.runways[t.runwayId]?.name ?? ''
    for (const e of t.events) {
      rows.push({ at: e.at, runway: rwy, callsign: t.callsign, kind: t.kind, type: e.type, from: e.from ?? '', to: e.to ?? '', detail: e.detail ?? '', text: eventText(e) })
    }
  }
  return rows.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Shift record as CSV text (UTC timestamps). */
export function shiftCsv(state) {
  const head = ['time_utc', 'runway', 'callsign', 'kind', 'event', 'from', 'to', 'detail']
  const lines = [head.join(',')]
  for (const r of shiftRows(state)) lines.push([r.at, r.runway, r.callsign, r.kind, r.type, r.from, r.to, r.detail].map(csvCell).join(','))
  return lines.join('\n') + '\n'
}

export function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function zuluOf(iso) {
  return formatZulu(iso)
}
