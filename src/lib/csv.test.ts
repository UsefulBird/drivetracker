import { describe, expect, it } from 'vitest'
import { buildCsv, fileStamp } from './csv.ts'

describe('buildCsv', () => {
  it('writes a header and one row per point', () => {
    const csv = buildCsv([
      { t: 0, lat: 1.5, lon: 2.5, altitude: null, speed: 10, heading: null, accuracy: 4, altitudeAccuracy: null },
    ])
    const [header, row] = csv.split('\n')
    expect(header.split(',')).toHaveLength(10)
    expect(row).toBe('1970-01-01T00:00:00.000Z,0,1.5,2.5,,10,36.0,,4,')
  })
})

describe('fileStamp', () => {
  it('uses local date and time', () => {
    expect(fileStamp(new Date(2026, 10, 16, 14, 2).getTime())).toBe('2026-11-16_1402')
  })
})
