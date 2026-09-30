import { useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './api'
import { useUser } from './lib/user'
import { useToast } from './lib/toast'
import Layout from './components/Layout'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import AdminUsersPage from './pages/AdminUsersPage'

function AuthGate() {
  const { setUser } = useUser()
  const navigate = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!username.trim() || !password.trim()) return
    if (mode === 'signup' && !name.trim()) {
      toast('이름을 입력하세요', 'err')
      return
    }
    setLoading(true)
    try {
      const u =
        mode === 'login'
          ? await api.login(username.trim(), password)
          : await api.signup(username.trim(), password, name.trim())
      navigate('/')
      setUser({ id: u.id, username: u.username ?? undefined, name: u.name, role: u.role ?? 'USER' })
    } catch (e) {
      toast(e instanceof Error ? e.message : '실패했어요', 'err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-logo">🗂️</div>
        <div className="gate-h">프로젝트 작업 관리</div>
        <div className="gate-sub">수정사항 통합 관리 시스템</div>

        <div className="segmented" style={{ width: '100%', marginBottom: 20 }}>
          <button
            className={`seg ${mode === 'login' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('login')}
          >
            로그인
          </button>
          <button
            className={`seg ${mode === 'signup' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('signup')}
          >
            회원가입
          </button>
        </div>

        <div className="stack" style={{ gap: 10, textAlign: 'left' }}>
          <input
            className="input"
            value={username}
            autoFocus
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="아이디"
          />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="비밀번호"
          />
          {mode === 'signup' && (
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="이름 (표시명)"
            />
          )}
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={submit}
          disabled={loading || !username.trim() || !password.trim()}
        >
          {loading ? <span className="spinner" /> : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { user } = useUser()

  if (!user) return <AuthGate />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Route>
    </Routes>
  )
}
