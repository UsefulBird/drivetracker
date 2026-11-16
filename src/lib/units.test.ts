import { describe, expect, it } from 'vitest'
import { formatAccuracy, formatAge, formatHeading, formatSpeedKmh, msToKmh } from './units.ts'

describe('msToKmh', () => {
  it('converts m/s to km/h', () => {
    expect(msToKmh(10)).toBeCloseTo(36)
    expect(msToKmh(0)).toBe(0)
  })
})

describe('formatSpeedKmh', () => {
  it('rounds to whole km/h', () => {
    expect(formatSpeedKmh(13.9)).toBe('50')
  })
  it('shows -- when Safari gives no speed', () => {
    expect(formatSpeedKmh(null)).toBe('--')
    expect(formatSpeedKmh(-1)).toBe('--')
    expect(formatSpeedKmh(NaN)).toBe('--')
  })
})

describe('formatHeading', () => {
  it('adds the compass point', () => {
    expect(formatHeading(0)).toBe('0° N')
    expect(formatHeading(135)).toBe('135° SE')
    expect(formatHeading(350)).toBe('350° N')
  })
  it('wraps 359.6 to 0', () => {
    expect(formatHeading(359.6)).toBe('0° N')
  })
  it('shows -- when unknown', () => {
    expect(formatHeading(null)).toBe('--')
    expect(formatHeading(NaN)).toBe('--')
    expect(formatHeading(-1)).toBe('--')
  })
})

describe('formatAccuracy', () => {
  it('rounds to whole metres', () => {
    expect(formatAccuracy(4.6)).toBe('± 5 m')
  })
})

describe('formatAge', () => {
  it('shows seconds with one decimal', () => {
    expect(formatAge(1234)).toBe('1.2 s')
    expect(formatAge(null)).toBe('--')
  })
})
