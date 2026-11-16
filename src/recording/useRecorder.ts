import { useSyncExternalStore } from 'react'
import { getState, subscribe, type RecorderState } from './recorder.ts'

/** Re-renders the component whenever the recorder's state changes. */
export function useRecorder(): RecorderState {
  return useSyncExternalStore(subscribe, getState)
}
