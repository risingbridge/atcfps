import { describe, expect, it } from 'vitest'
import { formatLevel, parseLevel, stepLevel } from './levels.js'

describe('levels', () => {
  it('parses common spellings', () => {
    expect(parseLevel('FL350')).toEqual({ mode: 'FL', hundreds: 350 })
    expect(parseLevel('fl 90')).toEqual({ mode: 'FL', hundreds: 90 })
    expect(parseLevel('F100')).toEqual({ mode: 'FL', hundreds: 100 })
    expect(parseLevel('A020')).toEqual({ mode: 'ALT', hundreds: 20 })
    expect(parseLevel('2000')).toEqual({ mode: 'ALT', hundreds: 20 })
    expect(parseLevel('2500ft')).toEqual({ mode: 'ALT', hundreds: 25 })
    expect(parseLevel('350')).toEqual({ mode: 'FL', hundreds: 350 })
    expect(parseLevel('20')).toEqual({ mode: 'ALT', hundreds: 20 })
    expect(parseLevel('')).toBeNull()
    expect(parseLevel('climb')).toBeNull()
  })
  it('formats canonically', () => {
    expect(formatLevel('FL', 90)).toBe('FL090')
    expect(formatLevel('ALT', 5)).toBe('A005')
    expect(formatLevel('FL', -10)).toBe('FL000')
  })
  it('steps in hundreds and keeps the mode', () => {
    expect(stepLevel('FL350', -10)).toBe('FL340')
    expect(stepLevel('A020', 5)).toBe('A025')
    expect(stepLevel('', 10)).toBe('FL010')
    expect(stepLevel('', 10, 'ALT')).toBe('A010')
  })
})
