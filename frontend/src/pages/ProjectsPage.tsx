import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Project } from '../api'
import { useUser, isAdmin } from '../lib/user'
import { useToast } from '../lib/toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Empty, fmtDate, fileToDataUrl } from '../components/ui'

const ICONS = ['🚀', '📦', '🎯', '🛠️', '💡', '📊', '🧩', '🌱']
const iconFor = (id: number) => ICONS[id % ICONS.length]

export default function ProjectsPage() {
  const { user } = useUser()
  const admin = isAdmin(user)
  const toast = useToast()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = projects.filter((p) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return p.projectName.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
  })

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function doDelete() {
    setDeleting(true)
    try {
      const res = await api.bulkDeleteProjects([...selected])
      toast(`프로젝트 ${res.deleted}개를 삭제했어요`, 'ok')
      setSelected(new Set())
      setConfirmDelete(false)
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '삭제 실패', 'err')
    } finally {
      setDeleting(false)
    }
  }

  async function load() {
    setLoading(true)
    try {
      setProjects(await api.listProjects(user?.id))
    } catch (e) {
      toast(e instanceof Error ? e.message : '불러오기 실패', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const p = await api.createProject({
        projectName: name.trim(),
        description: desc.trim() || undefined,
        createdBy: user?.id,
        logo,
      })
      toast('프로젝트를 생성했어요', 'ok')
      setShowCreate(false)
      setName('')
      setDesc('')
      setLogo(null)
      navigate(`/projects/${p.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : '생성 실패', 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <div className="page-title">프로젝트</div>
            {user?.role === 'ADMIN' && <span className="badge src-MEETING">관리자 · 전체 보기</span>}
          </div>
          <div className="page-sub">
            {user?.role === 'ADMIN'
              ? '모든 프로젝트를 관리합니다'
              : '내가 참여한 프로젝트만 표시됩니다'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          ＋ 새 프로젝트
        </button>
      </div>

      <div className="content">
        {loading ? (
          <div className="loading-full">
            <div className="spinner spinner-dark" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card card-pad">
            <Empty
              icon="📂"
              title="아직 프로젝트가 없어요"
              sub="새 프로젝트를 만들고 회의 MD를 올려 작업 목록을 자동 생성해보세요."
            />
          </div>
        ) : (
          <>
            {admin && selected.size > 0 && (
              <div className="bulk-bar" style={{ marginBottom: 16 }}>
                <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{selected.size}개 선택됨</span>
                <div className="row" style={{ gap: 8, marginLeft: 'auto' }}>
                  <button className="btn btn-danger-solid btn-sm" onClick={() => setConfirmDelete(true)}>
                    선택 삭제
                  </button>
                  <button className="btn btn-soft btn-sm" onClick={() => setSelected(new Set())}>
                    취소
                  </button>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <input
                className="input"
                style={{ width: '100%', padding: '13px 16px', fontSize: 15 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔍 프로젝트명 또는 설명으로 검색"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="card card-pad">
                <Empty icon="🔍" title="검색 결과가 없어요" sub="다른 검색어를 입력해보세요." />
              </div>
            ) : (
            <div className="grid grid-cards">
              {filtered.map((p) => (
                <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
                  {admin && (
                    <input
                      type="checkbox"
                      className="task-check proj-check"
                      checked={selected.has(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(p.id)}
                    />
                  )}
                  {p.logo ? (
                    <img className="pc-logo" src={p.logo} alt="" />
                  ) : (
                    <div className="pc-icon">{iconFor(p.id)}</div>
                  )}
                  <div className="pc-name">{p.projectName}</div>
                  <div className="pc-desc">{p.description || '설명이 없습니다'}</div>
                  <div className="pc-meta">
                    <span>📅 {fmtDate(p.createdAt).split(' ')[0]}</span>
                    <span>· 수정 {fmtDate(p.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          icon="🗑"
          tone="danger"
          title="프로젝트 삭제"
          message={`선택한 프로젝트 ${selected.size}개를 삭제하시겠습니까?`}
          confirmText="삭제"
          cancelText="취소"
          loading={deleting}
          onConfirm={doDelete}
          onClose={() => (deleting ? null : setConfirmDelete(false))}
        />
      )}

      {showCreate && (
        <Modal
          title="새 프로젝트"
          subtitle="프로젝트 이름과 설명을 입력하세요."
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <button className="btn btn-primary" onClick={create} disabled={saving || !name.trim()}>
                {saving ? <span className="spinner" /> : '생성'}
              </button>
              <button className="btn btn-soft" onClick={() => setShowCreate(false)}>
                취소
              </button>
            </>
          }
        >
          <div className="field">
            <label className="label">프로젝트명</label>
            <input
              className="input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="예: 회원 관리 시스템 개편"
            />
          </div>
          <div className="field">
            <label className="label">설명 (선택)</label>
            <textarea
              className="textarea"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명"
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">로고 (선택)</label>
            <div className="row" style={{ gap: 12 }}>
              {logo ? (
                <img className="logo-preview" src={logo} alt="" />
              ) : (
                <div className="logo-preview empty">🗂️</div>
              )}
              <div className="row" style={{ gap: 8 }}>
                <label className="btn btn-soft btn-sm" style={{ cursor: 'pointer' }}>
                  이미지 선택
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      try {
                        setLogo(await fileToDataUrl(f))
                      } catch (err) {
                        toast(err instanceof Error ? err.message : '이미지 오류', 'err')
                      }
                    }}
                  />
                </label>
                {logo && (
                  <button className="btn btn-soft btn-sm" onClick={() => setLogo(null)}>
                    제거
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
