import { useEffect, useState } from 'react'
import { requestPersistentStorage, type PersistStatus } from '../db/persistence.ts'

const persistText: Record<PersistStatus, string> = {
  persisted: 'Protected — iOS won’t delete your drives to free up space.',
  'not-persisted':
    'Not protected — iOS may delete saved drives if the app goes unused for weeks. Opening it from the home screen icon helps.',
  unsupported: 'Unknown — this browser can’t protect storage.',
}

export default function SettingsPage() {
  const [persist, setPersist] = useState<PersistStatus | null>(null)

  useEffect(() => {
    requestPersistentStorage().then(setPersist)
  }, [])

  return (
    <section>
      <h1>Settings</h1>

      <h2>Storage</h2>
      <p className="muted">{persist ? persistText[persist] : 'Checking…'}</p>

      <h2>Install on iPhone</h2>
      <ol className="muted">
        <li>Open this page in Safari.</li>
        <li>
          Tap the <b>Share</b> button (square with an arrow).
        </li>
        <li>
          Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
        </li>
        <li>Open DriveTracker from its new home screen icon.</li>
      </ol>
      <p className="muted">
        It then opens full screen without Safari's bars, and works without signal once it has been
        opened online at least once.
      </p>
    </section>
  )
}
