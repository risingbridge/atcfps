const pad = (n) => String(n).padStart(2, '0')

export function formatZulu(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '----Z'
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`
}

export function formatClock(ms) {
  const d = new Date(ms)
  return { hm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, s: pad(d.getUTCSeconds()) }
}

export function minutesSince(iso, now = Date.now()) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / 60_000))
}

export function formatMinutes(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${pad(m)}` : `${h}h`
}

/** The next timer to fire (or the most overdue): { at, label, remainingMs, due }. */
export function soonestTimer(timers, now = Date.now()) {
  if (!timers?.length) return null
  const sorted = [...timers].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const t = sorted[0]
  const remainingMs = Date.parse(t.at) - now
  return { ...t, remainingMs, due: remainingMs <= 0 }
}

/** "m:ss" for short countdowns, "h:mm" beyond an hour. */
export function formatCountdown(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s >= 3600) return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}h`
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}
