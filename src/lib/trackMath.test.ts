import { describe, expect, it } from 'vitest'
import { countGaps, distanceM, durationS, haversineM, maxSpeed, summariseTrack } from './trackMath.ts'

describe('haversineM', () => {
  it('is 0 for the same point', () => {
    expect(haversineM(51.5, -0.1, 51.5, -0.1)).toBe(0)
  })
  it('measures one degree of latitude as about 111 km', () => {
    expect(haversineM(0, 0, 1, 0)).toBeCloseTo(111_195, -1)
  })
})

describe('distanceM', () => {
  it('adds up the legs between points', () => {
    const points = [
      { lat: 0, lon: 0, accuracy: 5 },
      { lat: 0.001, lon: 0, accuracy: 5 },
      { lat: 0.002, lon: 0, accuracy: 5 },
    ]
    expect(distanceM(points)).toBeCloseTo(222.4, 0)
  })
  it('skips points with accuracy worse than 30 m', () => {
    const points = [
      { lat: 0, lon: 0, accuracy: 5 },
      { lat: 0.05, lon: 0.05, accuracy: 65 }, // a GPS jump far off the road
      { lat: 0.001, lon: 0, accuracy: 30 },
    ]
    expect(distanceM(points)).toBeCloseTo(111.2, 0)
  })
  it('is 0 with fewer than two usable points', () => {
    expect(distanceM([])).toBe(0)
    expect(distanceM([{ lat: 0, lon: 0, accuracy: 5 }])).toBe(0)
  })
})

describe('durationS', () => {
  it('converts ms to seconds', () => {
    expect(durationS(1_000, 61_500)).toBe(60.5)
  })
  it('is never negative', () => {
    expect(durationS(10, 0)).toBe(0)
  })
})

describe('maxSpeed', () => {
  it('ignores missing speeds', () => {
    expect(maxSpeed([{ speed: 3 }, { speed: null }, { speed: 25 }])).toBe(25)
  })
  it('is null when the GPS never gave a speed', () => {
    expect(maxSpeed([{ speed: null }])).toBeNull()
    expect(maxSpeed([])).toBeNull()
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
  it('combines all the stats', () => {
    const points = [
      { t: 0, lat: 0, lon: 0, speed: 10, accuracy: 5 },
      { t: 1_000, lat: 0.001, lon: 0, speed: null, accuracy: 5 },
      { t: 10_000, lat: 0.002, lon: 0, speed: 25, accuracy: 5 },
    ]
    expect(summariseTrack(points, 0, 12_000)).toEqual({
      pointCount: 3,
      gapCount: 1,
      distanceM: expect.closeTo(222.4, 0),
      durationS: 12,
      maxSpeed: 25,
    })
  })
})
