/**
 * Alarm tone, generated on the device with Web Audio — no files, no
 * network. A short two-note chirp, repeated while `alarm` is true.
 */
let ctx = null
let timer = null

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function chirp() {
  const c = ensure()
  if (!c) return
  const t0 = c.currentTime
  for (const [f, start] of [[880, 0], [1175, 0.16]]) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'square'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t0 + start)
    g.gain.exponentialRampToValueAtTime(0.18, t0 + start + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + 0.14)
    o.connect(g).connect(c.destination)
    o.start(t0 + start)
    o.stop(t0 + start + 0.16)
  }
}

/** Start/stop the repeating alarm. Safe to call repeatedly. */
export function setAlarm(on) {
  if (on && !timer) {
    chirp()
    timer = setInterval(chirp, 1500)
  } else if (!on && timer) {
    clearInterval(timer)
    timer = null
  }
}

/** Browsers require a user gesture before audio; call this from any tap to unlock. */
export function unlockAudio() {
  ensure()
}
