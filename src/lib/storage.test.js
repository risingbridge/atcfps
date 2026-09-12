import { describe, expect, it } from 'vitest'
import { initialState } from '../state/store.js'
import { BACKUP_KEY, STORAGE_KEY, load, save } from './storage.js'

function memoryStorage() {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}

describe('storage', () => {
  it('round-trips state', () => {
    const store = memoryStorage()
    const s = initialState({ boardId: 'b' })
    expect(save(s, store)).toBe(true)
    expect(load(store)).toEqual(s)
  })

  it('returns null when nothing is stored', () => {
    expect(load(memoryStorage())).toBeNull()
  })

  it('moves unparseable data to the backup key', () => {
    const store = memoryStorage()
    store.setItem(STORAGE_KEY, '{not json')
    expect(load(store)).toBeNull()
    expect(store.getItem(BACKUP_KEY)).toBe('{not json')
    expect(store.getItem(STORAGE_KEY)).toBeNull()
  })

  it('moves wrong-version data to the backup key', () => {
    const store = memoryStorage()
    const raw = JSON.stringify({ version: 99, ...initialState({ boardId: 'b' }) })
    store.setItem(STORAGE_KEY, raw)
    expect(load(store)).toBeNull()
    expect(store.getItem(BACKUP_KEY)).toBe(raw)
  })

  it('repairs a dangling activeBoardId', () => {
    const store = memoryStorage()
    save({ ...initialState({ boardId: 'b' }), activeBoardId: 'gone' }, store)
    expect(load(store).activeBoardId).toBe('b')
  })
})
