export default function Navbar({ user, page, setPage, onLogout }) {
  const tabs = [
    { id:'courses',   label:'📚 Courses'   },
    { id:'dashboard', label:'📊 Dashboard' },
    { id:'profile',   label:'👤 Profile'   },
  ]
  return (
    <nav className="navbar">
      <div className="navbar-brand">⚡ Exam<span>Pulse</span></div>
      <div className="nav-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`nav-tab ${page === t.id ? 'active' : ''}`} onClick={() => setPage(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <span className="nav-user">{user.name || user.email}</span>
        <button className="btn btn-sm" style={{background:'rgba(255,255,255,.12)',color:'#fff',border:'none'}} onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  )
}
