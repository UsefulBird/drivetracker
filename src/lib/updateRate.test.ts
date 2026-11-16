import { describe, expect, it } from 'vitest'
import { pruneOld, updatesPerMinute } from './updateRate.ts'

describe('updatesPerMinute', () => {
  it('counts updates within the last 60 s', () => {
    const now = 100_000
    expect(updatesPerMinute([30_000, 40_001, 70_000, 99_000], now)).toBe(3)
  })
  it('is 0 with no updates', () => {
    expect(updatesPerMinute([], 5_000)).toBe(0)
  })
})

describe('pruneOld', () => {
  it('keeps only recent timestamps', () => {
    expect(pruneOld([1_000, 61_000, 62_000], 121_500)).toEqual([62_000])
  })
})
