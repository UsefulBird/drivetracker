import { Navigate, Route, Routes } from 'react-router'
import TabBar from './components/TabBar.tsx'
import RecordPage from './pages/RecordPage.tsx'
import DrivesPage from './pages/DrivesPage.tsx'
import RoutesPage from './pages/RoutesPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'

export default function App() {
  return (
    <div className="app">
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/record" replace />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/drives" element={<DrivesPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/record" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
