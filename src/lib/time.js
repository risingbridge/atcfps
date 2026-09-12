/** ISO timestamp → "HHmmZ" (UTC), as written on real strips. */
export function formatZulu(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '----Z'
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}${mm}Z`
}

/** Minutes after which a strip that hasn't moved is flagged. */
export const AGING_MINUTES = 15
export const STALE_MINUTES = 45

/** Whole minutes between an ISO timestamp and `now` (ms). */
export function minutesSince(iso, now = Date.now()) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((now - t) / 60_000))
}

/** "7m", "1h05", "3h" — compact time-in-bay label. */
export function formatMinutes(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function ageClass(min) {
  if (min >= STALE_MINUTES) return 'is-stale'
  if (min >= AGING_MINUTES) return 'is-aging'
  return ''
}
