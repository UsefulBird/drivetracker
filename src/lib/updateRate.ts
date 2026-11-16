export const RATE_WINDOW_MS = 60_000

/** Drops timestamps older than the one-minute window. Returns a new array. */
export function pruneOld(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < RATE_WINDOW_MS)
}

/** How many updates arrived in the last minute. */
export function updatesPerMinute(timestamps: number[], now: number): number {
  return pruneOld(timestamps, now).length
}
