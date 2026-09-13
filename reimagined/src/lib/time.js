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
