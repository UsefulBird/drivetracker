export default function SettingsPage() {
  return (
    <section>
      <h1>Settings</h1>

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
