import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PointFields } from '../lib/track.ts'
import { createReplaySource } from './replaySource.ts'

const point = (t: number, lat: number): PointFields => ({
  t,
  lat,
  lon: 0,
  altitude: null,
  speed: 10,
  heading: null,
  accuracy: 40,
  altitudeAccuracy: null,
})
const track = [point(0, 0), point(1_000, 1), point(3_000, 2)]

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createReplaySource', () => {
  it('sends points at real speed and ends after the last one', () => {
    const onEnd = vi.fn()
    const received: number[] = []
    const source = createReplaySource(track, 1, onEnd)
    source.watchPosition((pos) => received.push(pos.coords.latitude), () => {})

    // Like real GPS, the first position arrives just after watchPosition returns.
    expect(received).toEqual([])
    vi.advanceTimersByTime(0)
    expect(received).toEqual([0])
    vi.advanceTimersByTime(999)
    expect(received).toEqual([0])
    vi.advanceTimersByTime(1)
    expect(received).toEqual([0, 1])
    vi.advanceTimersByTime(2_000)
    expect(received).toEqual([0, 1, 2])
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('runs 10× faster when asked', () => {
    const received: number[] = []
    createReplaySource(track, 10, () => {}).watchPosition((pos) => received.push(pos.coords.latitude), () => {})
    vi.advanceTimersByTime(300)
    expect(received).toEqual([0, 1, 2])
  })

  it('passes accuracy through unchanged, so distance filtering matches the original', () => {
    let accuracy = 0
    createReplaySource(track, 1, () => {}).watchPosition((pos) => (accuracy = pos.coords.accuracy), () => {})
    vi.advanceTimersByTime(0)
    expect(accuracy).toBe(40)
  })

  it('does not rewind when the watch is restarted', () => {
    const received: number[] = []
    const source = createReplaySource(track, 1, () => {})
    const id = source.watchPosition((pos) => received.push(pos.coords.latitude), () => {})
    vi.advanceTimersByTime(1_000)
    source.clearWatch(id)
    source.watchPosition((pos) => received.push(pos.coords.latitude), () => {})
    vi.advanceTimersByTime(2_000)
    expect(received).toEqual([0, 1, 2])
  })

  it('stops sending after stop()', () => {
    const received: number[] = []
    const onEnd = vi.fn()
    const source = createReplaySource(track, 1, onEnd)
    source.watchPosition((pos) => received.push(pos.coords.latitude), () => {})
    vi.advanceTimersByTime(0)
    source.stop()
    vi.advanceTimersByTime(5_000)
    expect(received).toEqual([0])
    expect(onEnd).not.toHaveBeenCalled()
  })
})
