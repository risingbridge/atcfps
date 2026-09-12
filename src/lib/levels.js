/**
 * Level strings on strips: "FL350" (flight level) or "A020" (altitude in
 * hundreds of feet). Parsing is lenient; formatting is canonical.
 */

export const FL_COMMON = [50, 70, 90, 100, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350, 370, 390, 410]
export const ALT_COMMON = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100]

/** @returns {{ mode: 'FL'|'ALT', hundreds: number } | null} */
export function parseLevel(text) {
  const t = String(text ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!t) return null
  let m
  if ((m = /^FL?(\d{1,3})$/.exec(t))) return { mode: 'FL', hundreds: Number(m[1]) }
  if ((m = /^A(\d{1,3})$/.exec(t))) return { mode: 'ALT', hundreds: Number(m[1]) }
  if ((m = /^(\d{1,3})(?:00)?FT$/.exec(t))) return { mode: 'ALT', hundreds: Number(m[1]) }
  if ((m = /^(\d+)$/.exec(t))) {
    const n = Number(m[1])
    if (n >= 1000) return { mode: 'ALT', hundreds: Math.round(n / 100) } // feet
    if (n >= 100) return { mode: 'FL', hundreds: n } // "350"
    return { mode: 'ALT', hundreds: n } // "20" → A020
  }
  return null
}

export function formatLevel(mode, hundreds) {
  const n = Math.max(0, Math.min(999, Math.round(hundreds)))
  return `${mode === 'FL' ? 'FL' : 'A'}${String(n).padStart(3, '0')}`
}

/** Step a level string by `delta` hundreds (in the given mode when the text is empty). */
export function stepLevel(text, delta, fallbackMode = 'FL') {
  const cur = parseLevel(text) ?? { mode: fallbackMode, hundreds: 0 }
  return formatLevel(cur.mode, cur.hundreds + delta)
}
