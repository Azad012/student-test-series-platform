export default function ProfilePage({ user, onLogout }) {
  return (
    <div style={{maxWidth:480}}>
      <h1 className="page-title">👤 My Profile</h1>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
          <div style={{width:60,height:60,borderRadius:'50%',background:'var(--primary-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'var(--primary)'}}>
            {(user.name || user.email || 'S')[0].toUpperCase()}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:18}}>{user.name || 'Student'}</div>
            <div className="text-muted text-sm">{user.email}</div>
            {user.phone && <div className="text-muted text-sm">📞 {user.phone}</div>}
          </div>
        </div>
        <div style={{borderTop:'1px solid var(--border)',paddingTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <span className="text-muted text-sm">Role</span>
            <span className="badge badge-primary">{user.role || 'Student'}</span>
          </div>
          {user.createdAt && (
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span className="text-muted text-sm">Member Since</span>
              <span className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
      <button className="btn btn-danger w-full" onClick={() => { if (window.confirm('Logout?')) onLogout() }}>
        🚪 Logout
      </button>
    </div>
  )
}
