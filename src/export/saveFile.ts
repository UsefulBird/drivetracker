export type SaveResult = 'shared' | 'downloaded' | 'cancelled' | 'needs-tap'

/**
 * Offers a file to the user: the iOS share sheet (Save to Files, AirDrop…) when
 * available, otherwise a normal download.
 *
 * Safari only allows the share sheet straight after a tap. If preparing the file
 * took too long it refuses with 'needs-tap'; show a second button that calls
 * this again with the ready file.
 */
export async function saveFile(file: File): Promise<SaveResult> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      if (err instanceof DOMException && err.name === 'NotAllowedError') return 'needs-tap'
      // Any other failure: fall back to a download below.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}
