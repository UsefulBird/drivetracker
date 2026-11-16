export type PersistStatus = 'persisted' | 'not-persisted' | 'unsupported'

let result: Promise<PersistStatus> | null = null

/**
 * Asks the browser to never clear our storage to free up space. Without this,
 * Safari may delete site data that hasn't been used for a while. Runs once.
 */
export function requestPersistentStorage(): Promise<PersistStatus> {
  result ??= (async () => {
    if (!navigator.storage?.persist) return 'unsupported'
    try {
      if (await navigator.storage.persisted()) return 'persisted'
      return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted'
    } catch {
      return 'not-persisted'
    }
  })()
  return result
}
