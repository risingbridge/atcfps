/**
 * Recall: suggest previous flights for a callsign prefix, from current
 * tokens and history (newest first, de-duplicated by callsign).
 */
export function recall(state, prefix, limit = 6) {
  const p = prefix.trim().toUpperCase()
  if (!p) return []
  const seen = new Set()
  const out = []
  const consider = (t) => {
    if (!t.callsign || (t.kind !== 'ifr' && t.kind !== 'vfr')) return
    const cs = t.callsign.toUpperCase()
    if (!cs.startsWith(p) || seen.has(cs)) return
    seen.add(cs)
    out.push({ callsign: t.callsign, kind: t.kind, type: t.type, wake: t.wake, runway: t.runway, stand: t.stand, intent: t.intent })
  }
  for (const t of state.history) consider(t)
  for (const t of Object.values(state.tokens).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) consider(t)
  return out.slice(0, limit)
}
