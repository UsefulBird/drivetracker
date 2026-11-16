import { NavLink } from 'react-router'

const tabs = [
  { to: '/record', label: 'Record', icon: '●' },
  { to: '/drives', label: 'Drives', icon: '☰' },
  { to: '/routes', label: 'Routes', icon: '★' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className="tab">
          <span className="tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
