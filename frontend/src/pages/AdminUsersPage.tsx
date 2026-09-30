import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type User } from '../api'
import { useUser, isAdmin } from '../lib/user'
import { useToast } from '../lib/toast'
import { Empty, fmtDate } from '../components/ui'

export default function AdminUsersPage() {
  const { user } = useUser()
  const toast = useToast()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setUsers(await api.listUsers())
    } catch (e) {
      toast(e instanceof Error ? e.message : '불러오기 실패', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleRole(u: User) {
    const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (u.username === 'webmaster') {
      toast('기본 관리자 계정의 권한은 변경할 수 없습니다', 'err')
      return
    }
    try {
      await api.updateUserRole(u.id, next)
      await load()
      toast(`${u.name} 권한을 ${next === 'ADMIN' ? '관리자' : '일반'}로 변경했어요`, 'ok')
    } catch (e) {
      toast(e instanceof Error ? e.message : '변경 실패', 'err')
    }
  }

  if (!isAdmin(user)) {
    return (
      <>
        <div className="topbar">
          <div className="page-title">접근 권한 없음</div>
        </div>
        <div className="content">
          <div className="card card-pad">
            <Empty icon="🔒" title="관리자만 접근할 수 있어요" />
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                프로젝트로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const loginUsers = users.filter((u) => u.username)
  const memberOnly = users.filter((u) => !u.username)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">사용자 관리</div>
          <div className="page-sub">로그인 계정의 권한을 관리합니다</div>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="loading-full">
            <div className="spinner spinner-dark" />
          </div>
        ) : (
          <>
            <div className="card card-pad" style={{ marginBottom: 18 }}>
              <div className="card-title" style={{ marginBottom: 16 }}>
                <span className="ico">🔑</span> 로그인 계정 ({loginUsers.length})
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>아이디</th>
                    <th>이름</th>
                    <th>권한</th>
                    <th>가입일</th>
                    <th style={{ textAlign: 'right' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {loginUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.name}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'src-CUSTOMER' : 'st-NOT_STARTED'}`}>
                          {u.role === 'ADMIN' ? '👑 관리자' : '일반'}
                        </span>
                      </td>
                      <td className="muted">{fmtDate(u.createdAt).split(' ')[0]}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-soft btn-sm"
                          disabled={u.username === 'webmaster'}
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === 'ADMIN' ? '일반으로' : '관리자로'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {memberOnly.length > 0 && (
              <div className="card card-pad">
                <div className="card-title" style={{ marginBottom: 8 }}>
                  <span className="ico">🙋</span> 담당자 전용 (로그인 불가) — {memberOnly.length}
                </div>
                <div className="page-sub" style={{ marginBottom: 12 }}>
                  담당자로만 등록되어 로그인 계정이 없는 사용자입니다.
                </div>
                <div className="row wrap" style={{ gap: 8 }}>
                  {memberOnly.map((u) => (
                    <span key={u.id} className="member-chip">
                      <span className="a-av">{u.name.slice(0, 1).toUpperCase()}</span>
                      {u.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
