import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './db/persistence.ts'
import { init as initRecorder } from './recording/recorder.ts'

requestPersistentStorage()
initRecorder()

// HashRouter keeps the page path in the URL after "#", so refreshing or
// reopening on GitHub Pages never hits a 404 for /drivetracker/drives etc.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
