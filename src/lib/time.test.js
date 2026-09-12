import { describe, expect, it } from 'vitest'
import { ageClass, formatMinutes, formatZulu, minutesSince } from './time.js'

describe('time helpers', () => {
  it('formats Zulu', () => {
    expect(formatZulu('2026-09-12T14:32:10Z')).toBe('1432Z')
    expect(formatZulu('garbage')).toBe('----Z')
  })
  it('minutesSince floors and clamps', () => {
    const t = Date.parse('2026-09-12T10:00:00Z')
    expect(minutesSince('2026-09-12T09:52:30Z', t)).toBe(7)
    expect(minutesSince('2026-09-12T10:05:00Z', t)).toBe(0)
    expect(minutesSince('nope', t)).toBe(0)
  })
  it('formatMinutes', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(59)).toBe('59m')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(125)).toBe('2h05')
  })
  it('ageClass thresholds', () => {
    expect(ageClass(0)).toBe('')
    expect(ageClass(15)).toBe('is-aging')
    expect(ageClass(45)).toBe('is-stale')
  })
})
