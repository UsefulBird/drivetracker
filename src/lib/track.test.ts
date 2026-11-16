import { describe, expect, it } from 'vitest'
import { toPointFields } from './track.ts'

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
