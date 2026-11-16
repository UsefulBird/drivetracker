// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { buildGpx, parseGpx } from './gpx.ts'
import type { PointFields } from './track.ts'

const points: PointFields[] = [
  { t: 1_700_000_000_000, lat: 51.5, lon: -0.12, altitude: 12.5, speed: 13.4, heading: 90, accuracy: 4, altitudeAccuracy: 3 },
  { t: 1_700_000_001_000, lat: 51.5001, lon: -0.1199, altitude: null, speed: null, heading: null, accuracy: 45, altitudeAccuracy: null },
]

describe('buildGpx / parseGpx', () => {
  it('round-trips every stored field', () => {
    expect(parseGpx(buildGpx('Test', points))[0]).toEqual(points[0])
  })
  it('keeps accuracy so replayed distance matches', () => {
    expect(parseGpx(buildGpx('Test', points))[1].accuracy).toBe(45)
  })
  it('escapes the drive name', () => {
    expect(buildGpx('A & B <1>', points)).toContain('<name>A &#38; B &#60;1&#62;</name>')
  })
})

describe('parseGpx with files from other apps', () => {
  const foreign = `<?xml version="1.0"?>
    <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
      <trk><trkseg>
        <trkpt lat="0.001" lon="0"><time>2024-01-01T00:00:10Z</time></trkpt>
        <trkpt lat="0" lon="0"><ele>5</ele><time>2024-01-01T00:00:00Z</time></trkpt>
      </trkseg></trk>
    </gpx>`

  it('sorts by time, assumes good accuracy and works out speed', () => {
    const [a, b] = parseGpx(foreign)
    expect(a.lat).toBe(0)
    expect(a.altitude).toBe(5)
    expect(a.accuracy).toBe(5)
    expect(b.speed).toBeCloseTo(11.12, 1)
  })

  it('rejects files without a track', () => {
    expect(() => parseGpx('<gpx></gpx>')).toThrow(/at least two points/)
    expect(() => parseGpx('not xml <')).toThrow()
  })
})
