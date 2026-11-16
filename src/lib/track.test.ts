import { describe, expect, it } from 'vitest'
import { countGaps, haversineM, summariseTrack, toPointFields } from './track.ts'

describe('haversineM', () => {
  it('is 0 for the same point', () => {
    expect(haversineM(51.5, -0.1, 51.5, -0.1)).toBe(0)
  })
  it('measures one degree of latitude as about 111 km', () => {
    expect(haversineM(0, 0, 1, 0)).toBeCloseTo(111_195, -1)
  })
})

describe('countGaps', () => {
  it('counts pauses longer than 5 s', () => {
    expect(countGaps([0, 1_000, 2_000, 32_000, 33_000, 38_001])).toBe(2)
  })
  it('does not count exactly 5 s', () => {
    expect(countGaps([0, 5_000])).toBe(0)
  })
  it('handles empty and single tracks', () => {
    expect(countGaps([])).toBe(0)
    expect(countGaps([1])).toBe(0)
  })
})

describe('summariseTrack', () => {
  it('adds up distance, max speed, gaps and duration', () => {
    const points = [
      { t: 0, lat: 0, lon: 0, speed: 10 },
      { t: 1_000, lat: 0.001, lon: 0, speed: null },
      { t: 10_000, lat: 0.002, lon: 0, speed: 25 },
    ]
    const s = summariseTrack(points, 0, 12_000)
    expect(s.pointCount).toBe(3)
    expect(s.gapCount).toBe(1)
    expect(s.distanceM).toBeCloseTo(222.4, 0)
    expect(s.maxSpeed).toBe(25)
    expect(s.durationS).toBe(12)
  })
  it('has no max speed when the GPS never gave one', () => {
    expect(summariseTrack([], 0, 0).maxSpeed).toBeNull()
  })
})

describe('toPointFields', () => {
  const pos = {
    timestamp: 123,
    coords: {
      latitude: 1,
      longitude: 2,
      altitude: -5,
      accuracy: 4,
      altitudeAccuracy: -1,
      heading: NaN,
      speed: -1,
    },
  }
  it('stores missing speed and heading as null', () => {
    const p = toPointFields(pos)
    expect(p.speed).toBeNull()
    expect(p.heading).toBeNull()
    expect(p.altitudeAccuracy).toBeNull()
  })
  it('keeps negative altitude', () => {
    expect(toPointFields(pos).altitude).toBe(-5)
  })
})
