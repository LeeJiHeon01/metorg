import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useUser, isAdmin } from '../lib/user'
import { Avatar } from './ui'
import AccountModal from './AccountModal'

export default function Layout() {
  const { user, setUser } = useUser()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">🗂️</div>
          <div>
            <div className="brand-name">프로젝트 작업 관리</div>
            <div className="brand-sub">수정사항 통합 관리</div>
          </div>
        </div>

        <div className="nav">
          <div className="nav-label">워크스페이스</div>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <span className="ico">📁</span> 프로젝트
          </NavLink>
          {isAdmin(user) && (
            <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="ico">🧑</span> 사용자 관리
            </NavLink>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <Avatar name={user?.name ?? '?'} />
            <div style={{ lineHeight: 1.3 }}>
              <div className="u-name">
                {user?.name}
                {user?.role === 'ADMIN' && ' 👑'}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="u-act" onClick={() => setAccountOpen(true)}>
                  계정 설정
                </button>
                <button className="u-act" onClick={() => setUser(null)}>
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </div>
  )
}
