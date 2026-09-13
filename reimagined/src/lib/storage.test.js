import { describe, expect, it } from 'vitest'
import { initialState } from '../model/store.js'
import { BACKUP_KEY, STORAGE_KEY, load, save } from './storage.js'

function mem() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

describe('flow storage', () => {
  it('round-trips and backs up corrupt data', () => {
    const store = mem()
    const s = initialState({ runwayId: 'r' })
    expect(save(s, store)).toBe(true)
    expect(load(store)).toEqual(s)
    store.setItem(STORAGE_KEY, '{bad')
    expect(load(store)).toBeNull()
    expect(store.getItem(BACKUP_KEY)).toBe('{bad')
  })
})
