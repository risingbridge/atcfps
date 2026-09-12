// Secure-context only (same requirement as the wake lock), with a fallback
// so the app still works over plain http on a LAN.
export function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
