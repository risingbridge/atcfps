/** ISO timestamp → "HHmmZ" (UTC), as written on real strips. */
export function formatZulu(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '----Z'
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}${mm}Z`
}
