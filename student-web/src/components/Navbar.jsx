export default function Navbar({ user, page, setPage, onLogout }) {
  const tabs = [
    { id: 'courses',   label: 'Courses',   icon: '📚' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'profile',   label: 'Profile',   icon: '👤' },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">⚡ Exam<span>Pulse</span></div>

        {/* Desktop / Tablet Navigation Tabs */}
        <div className="nav-tabs desktop-only">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`nav-tab ${page === t.id ? 'active' : ''}`}
              onClick={() => setPage(t.id)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <span className="nav-user desktop-only">{user.name || user.email}</span>
          <button
            className="btn btn-sm btn-logout"
            onClick={() => { if (window.confirm('Are you sure you want to log out?')) onLogout() }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Fixed for phones < 768px) */}
      <nav className="mobile-bottom-nav mobile-only">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`mobile-tab-item ${page === t.id ? 'active' : ''}`}
            onClick={() => setPage(t.id)}
          >
            <span className="mobile-tab-icon">{t.icon}</span>
            <span className="mobile-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
