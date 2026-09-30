import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  api,
  STATUS_LABEL,
  CHANGE_LABEL,
  type AiTaskNode,
  type AiTaskTree,
  type ChangeHistory,
  type ChangeType,
  type Project,
  type SourceType,
  type Task,
  type TaskStatus,
  type User,
} from '../api'
import { useUser, isAdmin } from '../lib/user'
import { useToast } from '../lib/toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { ChangeBadge, Empty, SourceBadge, fmtDate, fileToDataUrl } from '../components/ui'

type TaskNode = Task & { children: TaskNode[] }

function buildTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<number, TaskNode>()
  tasks.forEach((t) => byId.set(t.id, { ...t, children: [] }))
  const roots: TaskNode[] = []
  byId.forEach((node) => {
    if (node.parentTaskId && byId.has(node.parentTaskId)) {
      byId.get(node.parentTaskId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

const STATUSES: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'REVIEW_REQUESTED', 'NEEDS_FIX', 'DONE']
const STATUS_COLOR: Record<TaskStatus, string> = {
  NOT_STARTED: '#8b91a7',
  IN_PROGRESS: '#3b82f6',
  REVIEW_REQUESTED: '#f59e0b',
  NEEDS_FIX: '#f43f5e',
  DONE: '#10b981',
}

function todayString() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function addDaysString(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const SOURCES: SourceType[] = ['MEETING', 'TEST', 'CUSTOMER']
const CHANGE_TYPES: ChangeType[] = ['ADD', 'UPDATE', 'REMOVE']
const SOURCE_TEXT: Record<SourceType, string> = { MEETING: '회의', TEST: '테스트', CUSTOMER: '고객 요청' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const { user } = useUser()
  const admin = isAdmin(user)
  const toast = useToast()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([]) // 전역 사용자 풀 (팀원 추가 시 선택용)
  const [members, setMembers] = useState<User[]>([]) // 이 프로젝트의 팀원
  const [history, setHistory] = useState<ChangeHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tasks' | 'history'>('tasks')

  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [taskModal, setTaskModal] = useState<{ parentTaskId: number | null; editing: Task | null } | null>(null)
  const [memberModal, setMemberModal] = useState(false)
  const [finalConfirm, setFinalConfirm] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editLogo, setEditLogo] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkAssignee, setBulkAssignee] = useState('') // '' 미선택, 'none' 해제, 그 외 userId

  const [source, setSource] = useState<SourceType>('MEETING')
  const [changeText, setChangeText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mdSource, setMdSource] = useState<SourceType>('MEETING')
  const [preview, setPreview] = useState<AiTaskTree | null>(null)
  const [importing, setImporting] = useState(false)
  const [mineOnly, setMineOnly] = useState(false)
  const [filterAssignee, setFilterAssignee] = useState('') // 관리자용 담당자 필터 ('' 전체, 'none' 미지정, 그외 userId)
  const [undoing, setUndoing] = useState(false)
  // 작업 이력 탭 검색
  const [histQuery, setHistQuery] = useState('')
  const [histAssignee, setHistAssignee] = useState('') // '' 전체, 'none' 없음, 그외 담당자 이름
  const [histTypes, setHistTypes] = useState<Set<ChangeType>>(new Set())
  const [histSources, setHistSources] = useState<Set<SourceType>>(new Set())

  async function loadAll() {
    setLoading(true)
    try {
      const [p, t, u, m] = await Promise.all([
        api.getProject(projectId),
        api.listTasks(projectId),
        api.listUsers(),
        api.listMembers(projectId),
      ])
      setProject(p)
      setTasks(t)
      setUsers(u)
      setMembers(m)
    } catch (e) {
      toast(e instanceof Error ? e.message : '불러오기 실패', 'err')
    } finally {
      setLoading(false)
    }
  }

  async function reloadTasks() {
    setTasks(await api.listTasks(projectId))
  }
  async function reloadHistory() {
    setHistory(await api.listChangeHistory(projectId))
  }
  async function reloadMembers() {
    setMembers(await api.listMembers(projectId))
  }
  async function reloadUsers() {
    setUsers(await api.listUsers())
  }

  useEffect(() => {
    loadAll()
  }, [projectId])

  useEffect(() => {
    if (tab === 'history') reloadHistory()
  }, [tab])

  // ---- MD upload ----
  async function handleFile(file: File) {
    const name = file.name.toLowerCase()
    const supported = name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')
    if (!supported) {
      toast('MD 또는 TXT 파일만 지원합니다. 다른 형식은 추후 업데이트 예정입니다.', 'info')
      return
    }
    setUploading(true)
    try {
      const tree = await api.analyzeMarkdown(projectId, file)
      setPreview(tree && tree.tasks ? tree : { tasks: [] }) // 미리보기 모달 오픈
    } catch (e) {
      toast(e instanceof Error ? e.message : 'MD 분석 실패', 'err')
    } finally {
      setUploading(false)
    }
  }

  async function confirmImport(finalTree: AiTaskTree) {
    setImporting(true)
    try {
      const created = await api.importTree(projectId, finalTree, mdSource, user?.id)
      toast(`작업 ${created.length}개를 추가했어요`, 'ok')
      setPreview(null)
      await reloadTasks()
      if (tab === 'history') await reloadHistory()
    } catch (e) {
      toast(e instanceof Error ? e.message : '반영 실패', 'err')
    } finally {
      setImporting(false)
    }
  }

  function openEdit() {
    setEditName(project?.projectName ?? '')
    setEditDesc(project?.description ?? '')
    setEditLogo(project?.logo ?? null)
    setEditOpen(true)
  }
  async function saveEdit() {
    if (!editName.trim()) return
    setSavingEdit(true)
    try {
      const p = await api.updateProject(projectId, {
        projectName: editName.trim(),
        description: editDesc.trim() || undefined,
        logo: editLogo,
      })
      setProject(p)
      setEditOpen(false)
      toast('프로젝트를 수정했어요', 'ok')
    } catch (e) {
      toast(e instanceof Error ? e.message : '수정 실패', 'err')
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteProject() {
    setDeletingProject(true)
    try {
      await api.deleteProject(projectId)
      toast('프로젝트를 삭제했어요', 'ok')
      navigate('/')
    } catch (e) {
      toast(e instanceof Error ? e.message : '삭제 실패', 'err')
      setDeletingProject(false)
    }
  }

  async function undoFinalize() {
    setUndoing(true)
    try {
      const res = await api.undoFinalize(projectId)
      if (res.restored > 0) {
        toast(`최종 완료를 취소하고 ${res.restored}개 작업을 복구했어요`, 'ok')
        await reloadTasks()
        if (tab === 'history') await reloadHistory()
      } else {
        toast('복구할 최종 완료 기록이 없어요', 'info')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '복구 실패', 'err')
    } finally {
      setUndoing(false)
    }
  }

  // ---- Task CRUD ----
  async function saveTask(title: string, description: string, dueDate: string | null) {
    if (!taskModal) return
    try {
      if (taskModal.editing) {
        const t = taskModal.editing
        await api.updateTask(t.id, {
          title,
          description,
          status: t.status,
          assigneeId: t.assigneeId,
          parentTaskId: t.parentTaskId,
          dueDate,
        })
      } else {
        await api.createTask(projectId, {
          title,
          description: description || undefined,
          parentTaskId: taskModal.parentTaskId,
          dueDate,
        })
      }
      setTaskModal(null)
      await reloadTasks()
    } catch (e) {
      toast(e instanceof Error ? e.message : '저장 실패', 'err')
    }
  }

  async function patchTask(t: Task, patch: Partial<Task>) {
    try {
      await api.updateTask(t.id, {
        title: patch.title ?? t.title,
        description: patch.description ?? t.description,
        status: patch.status ?? t.status,
        assigneeId: patch.assigneeId !== undefined ? patch.assigneeId : t.assigneeId,
        parentTaskId: t.parentTaskId,
        dueDate: patch.dueDate !== undefined ? patch.dueDate : t.dueDate,
      })
      await reloadTasks()
    } catch (e) {
      toast(e instanceof Error ? e.message : '변경 실패', 'err')
    }
  }

  async function doFinalComplete() {
    setFinalizing(true)
    try {
      await api.completeAllTasks(projectId)
      await reloadTasks()
      if (tab === 'history') await reloadHistory()
      setFinalConfirm(false)
      toast('최종 완료했어요. 목록을 초기화했습니다.', 'ok')
    } catch (e) {
      toast(e instanceof Error ? e.message : '최종 완료 실패', 'err')
    } finally {
      setFinalizing(false)
    }
  }

  async function doRemoveTask() {
    if (!taskToDelete) return
    setDeletingTask(true)
    try {
      await api.deleteTask(taskToDelete.id)
      setTaskToDelete(null)
      await reloadTasks()
      toast('작업을 삭제했어요', 'ok')
    } catch (e) {
      toast(e instanceof Error ? e.message : '삭제 실패', 'err')
    } finally {
      setDeletingTask(false)
    }
  }

  // ---- 다중 선택 / 담당자 일괄 지정 ----
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allSelected = tasks.length > 0 && tasks.every((t) => selected.has(t.id))
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
  }
  async function applyBulkAssign() {
    if (selected.size === 0 || !bulkAssignee) return
    const assigneeId = bulkAssignee === 'none' ? null : Number(bulkAssignee)
    try {
      const res = await api.bulkAssign([...selected], assigneeId)
      await reloadTasks()
      setSelected(new Set())
      setBulkAssignee('')
      toast(`${res.updated}개 작업에 담당자를 지정했어요`, 'ok')
    } catch (e) {
      toast(e instanceof Error ? e.message : '일괄 지정 실패', 'err')
    }
  }

  async function addExistingMember(userId: number) {
    try {
      await api.addMemberExisting(projectId, userId)
      await reloadMembers()
    } catch (e) {
      toast(e instanceof Error ? e.message : '추가 실패', 'err')
    }
  }
  async function addNewMember(name: string) {
    try {
      await api.addMemberNew(projectId, name)
      await Promise.all([reloadMembers(), reloadUsers()])
      toast('담당자를 추가했어요', 'ok')
    } catch (e) {
      toast(e instanceof Error ? e.message : '추가 실패', 'err')
    }
  }
  async function removeMember(userId: number) {
    try {
      await api.removeMember(projectId, userId)
      await reloadMembers()
    } catch (e) {
      toast(e instanceof Error ? e.message : '제외 실패', 'err')
    }
  }

  // ---- Change request ----
  async function submitChange() {
    if (!changeText.trim()) return
    setSubmitting(true)
    try {
      const res = await api.submitChangeRequest(projectId, {
        sourceType: source,
        content: changeText.trim(),
        createdBy: user?.id,
      })
      toast(`AI가 수정사항 ${res.appliedCount}건을 반영했어요`, 'ok')
      setChangeText('')
      await reloadTasks()
      if (tab === 'history') await reloadHistory()
    } catch (e) {
      toast(e instanceof Error ? e.message : '수정사항 분석 실패', 'err')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-full">
        <div className="spinner spinner-dark" />
      </div>
    )
  }

  const todayStr = todayString()
  const soonStr = addDaysString(3)
  // 담당자 후보 = 관리자를 제외한 프로젝트 멤버 (관리자는 작업 수행자가 아님)
  const assignable = members.filter((m) => m.role !== 'ADMIN')

  // 담당자 필터 적용 (대시보드·목록 공통)
  let visibleTasks = tasks
  if (admin) {
    if (filterAssignee === 'none') visibleTasks = tasks.filter((t) => t.assigneeId == null)
    else if (filterAssignee) visibleTasks = tasks.filter((t) => String(t.assigneeId) === filterAssignee)
  } else if (mineOnly) {
    visibleTasks = tasks.filter((t) => t.assigneeId === user?.id)
  }
  const tree = buildTree(visibleTasks)

  // 진행 현황(대시보드)은 필터된 작업 기준으로 집계
  const total = visibleTasks.length
  const doneCount = visibleTasks.filter((t) => t.status === 'DONE').length
  const progress = total ? Math.round((doneCount / total) * 100) : 0
  const overdueCount = visibleTasks.filter((t) => t.dueDate && t.status !== 'DONE' && t.dueDate < todayStr).length
  const statusCounts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: visibleTasks.filter((t) => t.status === s).length }),
    {} as Record<TaskStatus, number>,
  )

  // 작업 이력 검색 필터
  const filteredHistory = history.filter((h) => {
    if (histTypes.size && !histTypes.has(h.changeType)) return false
    if (histSources.size && (!h.sourceType || !histSources.has(h.sourceType))) return false
    if (histAssignee === 'none' && h.assigneeName) return false
    if (histAssignee && histAssignee !== 'none' && h.assigneeName !== histAssignee) return false
    if (histQuery.trim()) {
      const q = histQuery.trim().toLowerCase()
      const hay = `${h.taskTitle ?? ''} ${h.before ?? ''} ${h.after ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const toggleHistType = (t: ChangeType) =>
    setHistTypes((prev) => {
      const n = new Set(prev)
      n.has(t) ? n.delete(t) : n.add(t)
      return n
    })
  const toggleHistSource = (s: SourceType) =>
    setHistSources((prev) => {
      const n = new Set(prev)
      n.has(s) ? n.delete(s) : n.add(s)
      return n
    })

  function dueClass(due?: string | null, status?: TaskStatus) {
    if (!due || status === 'DONE') return ''
    if (due < todayStr) return 'overdue'
    if (due <= soonStr) return 'soon'
    return ''
  }

  const renderNode = (node: TaskNode, depth: number) => (
    <Fragment key={node.id}>
      <div className={`task-row ${selected.has(node.id) ? 'selected' : ''}`} style={{ marginLeft: depth * 22 }}>
        <input
          type="checkbox"
          className="task-check"
          checked={selected.has(node.id)}
          onChange={() => toggleSelect(node.id)}
        />
        <div className="task-main">
          <div className={`task-title ${node.status === 'DONE' ? 'done' : ''}`}>
            {depth > 0 && <span style={{ color: 'var(--text-3)', marginRight: 6 }}>↳</span>}
            {node.title}
          </div>
          {node.description && <div className="task-desc">{node.description}</div>}
        </div>
        <div className="task-side">
          {node.dueDate && (
            <span className={`due-tag ${dueClass(node.dueDate, node.status)}`} title="마감일">
              📅 마감일 : {node.dueDate.slice(5)}
            </span>
          )}
          <select
            className="select input-sm"
            style={{ width: 'auto' }}
            value={node.assigneeId ?? ''}
            onChange={(e) => patchTask(node, { assigneeId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">담당자 없음</option>
            {assignable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            className={`select input-sm badge st-${node.status}`}
            style={{ width: 'auto', fontWeight: 700 }}
            value={node.status}
            onChange={(e) => patchTask(node, { status: e.target.value as TaskStatus })}
          >
            {STATUSES.filter((s) => admin || s !== 'NEEDS_FIX' || node.status === 'NEEDS_FIX').map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <div className="task-actions">
            <button className="icon-btn" title="하위 작업" onClick={() => setTaskModal({ parentTaskId: node.id, editing: null })}>
              ＋
            </button>
            <button className="icon-btn" title="수정" onClick={() => setTaskModal({ parentTaskId: node.parentTaskId ?? null, editing: node })}>
              ✎
            </button>
            <button className="icon-btn danger" title="삭제" onClick={() => setTaskToDelete(node)}>
              🗑
            </button>
          </div>
        </div>
      </div>
      {node.children.map((c) => renderNode(c, depth + 1))}
    </Fragment>
  )

  return (
    <>
      <div className="topbar">
        <div>
          <button className="crumb" onClick={() => navigate('/')}>
            ← 프로젝트
          </button>
          <div className="page-title row" style={{ gap: 10 }}>
            {project?.logo && <img className="pd-logo" src={project.logo} alt="" />}
            {project?.projectName}
          </div>
          {project?.description && <div className="page-sub">{project.description}</div>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" onClick={openEdit}>
            ✎ 수정
          </button>
          {admin && (
            <button className="btn btn-outline-danger" onClick={() => setDeleteConfirm(true)}>
              🗑 삭제
            </button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="tabs">
          <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            작업 목록
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            작업 이력
          </button>
        </div>

        {tab === 'tasks' && (
          <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
            {/* 대시보드 */}
            {tasks.length > 0 && (
              <div className="card card-pad">
                <div className="row between wrap" style={{ marginBottom: 14, gap: 10 }}>
                  <div className="card-title">
                    <span className="ico">📊</span> 진행 현황
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    {admin ? (
                      <select
                        className="select input-sm"
                        style={{ width: 'auto' }}
                        value={filterAssignee}
                        onChange={(e) => setFilterAssignee(e.target.value)}
                      >
                        <option value="">전체 담당자</option>
                        {assignable.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                        <option value="none">미지정</option>
                      </select>
                    ) : (
                      <button
                        className={`btn btn-sm ${mineOnly ? 'btn-primary' : 'btn-soft'}`}
                        onClick={() => setMineOnly((v) => !v)}
                      >
                        {mineOnly ? '✓ 내 작업만' : '내 작업만'}
                      </button>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{progress}% 완료</div>
                  </div>
                </div>
                <div className="dash-grid" style={{ marginBottom: 16 }}>
                  <div className="stat">
                    <div className="stat-num">{total}</div>
                    <div className="stat-label">전체 작업</div>
                  </div>
                  {STATUSES.map((s) => (
                    <div className="stat" key={s}>
                      <div className="stat-num" style={{ color: STATUS_COLOR[s] }}>{statusCounts[s]}</div>
                      <div className="stat-label">{STATUS_LABEL[s]}</div>
                    </div>
                  ))}
                  <div className="stat">
                    <div className="stat-num" style={{ color: overdueCount ? '#e11d48' : 'var(--text)' }}>{overdueCount}</div>
                    <div className="stat-label">마감 지남</div>
                  </div>
                </div>
                <div className="progress-track" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="status-bar">
                  {STATUSES.map((s) =>
                    statusCounts[s] > 0 ? (
                      <div
                        key={s}
                        className="status-seg"
                        style={{ width: `${(statusCounts[s] / total) * 100}%`, background: STATUS_COLOR[s] }}
                        title={`${STATUS_LABEL[s]} ${statusCounts[s]}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="legend">
                  {STATUSES.map((s) => (
                    <span key={s}>
                      <span className="dot" style={{ background: STATUS_COLOR[s] }} />
                      {STATUS_LABEL[s]} {statusCounts[s]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* MD 업로드 */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 12 }}>
                <span className="ico">🤖</span> 회의록 분석
              </div>
              <div className="page-sub" style={{ marginBottom: 14 }}>
                회의·테스트·고객 요청 중 출처를 선택하면 선택한 출처로 작업 이력에 기록됩니다.
              </div>
              <div className="segmented" style={{ marginBottom: 14 }}>
                {SOURCES.map((s) => (
                  <button key={s} className={`seg ${mdSource === s ? 'active' : ''}`} onClick={() => setMdSource(s)}>
                    {SOURCE_TEXT[s]}
                  </button>
                ))}
              </div>
              <div
                className={`dropzone ${drag ? 'drag' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDrag(true)
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDrag(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleFile(f)
                }}
              >
                {uploading ? (
                  <>
                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                    <div className="dz-title">AI가 분석 중이에요…</div>
                    <div className="dz-sub">회의 내용을 기능/요구사항/세부사항으로 구조화합니다</div>
                  </>
                ) : (
                  <>
                    <div className="dz-icon">📄</div>
                    <div className="dz-title">회의 MD 또는 TXT 파일을 올려주세요.</div>
                    <div className="dz-sub">클릭 또는 드래그 · AI가 작업 목록을 자동 생성합니다.</div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {/* 수정사항 입력 */}
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 6 }}>
                <span className="ico">✏️</span> 수정사항 입력
              </div>
              <div className="page-sub" style={{ marginBottom: 14 }}>
                회의·테스트·고객 요청에서 발생한 수정사항을 입력하면 AI가 기존 작업과 비교해 반영합니다.
              </div>
              <div className="segmented" style={{ marginBottom: 14 }}>
                {SOURCES.map((s) => (
                  <button key={s} className={`seg ${source === s ? 'active' : ''}`} onClick={() => setSource(s)}>
                    {SOURCE_TEXT[s]}
                  </button>
                ))}
              </div>
              <textarea
                className="textarea"
                value={changeText}
                onChange={(e) => setChangeText(e.target.value)}
                placeholder={'예) 검색 기본 조회 기간을 1개월에서 3개월로 변경해주세요.\n검색 결과가 없을 때 안내 문구를 추가해주세요.'}
              />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="btn btn-primary" onClick={submitChange} disabled={submitting || !changeText.trim()}>
                  {submitting ? <span className="spinner" /> : '🤖 AI 분석 및 반영'}
                </button>
              </div>
            </div>

            {/* 작업 목록 */}
            <div className="card card-pad">
              <div className="row between wrap" style={{ marginBottom: 16, gap: 10 }}>
                <div className="card-title">
                  <span className="ico">✅</span> 작업 목록
                  <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>
                    {visibleTasks.length}개
                  </span>
                </div>
                <div className="row">
                  {admin && tasks.length === 0 && (
                    <button className="btn btn-soft" onClick={undoFinalize} disabled={undoing}>
                      {undoing ? <span className="spinner spinner-dark" /> : '↩ 최종완료 취소'}
                    </button>
                  )}
                  {admin && tasks.length > 0 && (
                    <>
                      <button className="btn btn-complete" onClick={() => setFinalConfirm(true)}>
                        ✓ 최종 완료
                      </button>
                      <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
                    </>
                  )}
                  {assignable.slice(0, 6).map((u) => (
                    <span key={u.id} className="member-av" title={u.name}>
                      {u.name.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                  {assignable.length === 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>담당자 없음</span>
                  )}
                  <button className="btn btn-soft" onClick={() => setMemberModal(true)}>
                    ＋ 담당자
                  </button>
                </div>
              </div>

              {tasks.length > 0 && (
                <div className="bulk-bar">
                  <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input type="checkbox" className="task-check" checked={allSelected} onChange={toggleAll} />
                    전체 선택
                  </label>
                  {selected.size > 0 && (
                    <div className="row wrap" style={{ gap: 8, marginLeft: 'auto' }}>
                      <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
                        {selected.size}개 선택됨
                      </span>
                      <select
                        className="select input-sm"
                        style={{ width: 'auto' }}
                        value={bulkAssignee}
                        onChange={(e) => setBulkAssignee(e.target.value)}
                      >
                        <option value="">담당자 선택</option>
                        {assignable.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                        <option value="none">담당 해제</option>
                      </select>
                      <button className="btn btn-primary btn-sm" onClick={applyBulkAssign} disabled={!bulkAssignee}>
                        담당자 지정
                      </button>
                      <button className="btn btn-soft btn-sm" onClick={() => setSelected(new Set())}>
                        취소
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tasks.length === 0 ? (
                <Empty icon="🗒️" title="아직 작업이 없어요" sub="MD를 분석하거나 '작업 추가'로 시작하세요." />
              ) : tree.length === 0 ? (
                <Empty icon="🔍" title="해당 담당자의 작업이 없어요" sub="다른 담당자를 선택하거나 전체 담당자로 보세요." />
              ) : (
                <div className="task-list">{tree.map((n) => renderNode(n, 0))}</div>
              )}

              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => setTaskModal({ parentTaskId: null, editing: null })}>
                  ＋ 작업 추가
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 16 }}>
              <span className="ico">🕑</span> 작업 이력
            </div>

            {history.length > 0 && (
              <div className="stack" style={{ gap: 12, marginBottom: 18 }}>
                {/* 유형 / 출처 버튼 */}
                <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>유형</span>
                  {CHANGE_TYPES.map((t) => (
                    <button
                      key={t}
                      className={`btn btn-sm ${histTypes.has(t) ? 'btn-primary' : 'btn-soft'}`}
                      onClick={() => toggleHistType(t)}
                    >
                      {CHANGE_LABEL[t]}
                    </button>
                  ))}
                  <span className="muted" style={{ fontSize: 12, fontWeight: 700, marginLeft: 10 }}>출처</span>
                  {SOURCES.map((s) => (
                    <button
                      key={s}
                      className={`btn btn-sm ${histSources.has(s) ? 'btn-primary' : 'btn-soft'}`}
                      onClick={() => toggleHistSource(s)}
                    >
                      {SOURCE_TEXT[s]}
                    </button>
                  ))}
                </div>
                {/* 담당자 */}
                <select
                  className="select"
                  style={{ maxWidth: 220 }}
                  value={histAssignee}
                  onChange={(e) => setHistAssignee(e.target.value)}
                >
                  <option value="">전체 담당자</option>
                  {assignable.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                  <option value="none">관리자</option>
                </select>
                {/* 검색어 */}
                <input
                  className="input"
                  value={histQuery}
                  onChange={(e) => setHistQuery(e.target.value)}
                  placeholder="🔍 작업 명칭 또는 내용으로 검색"
                />
              </div>
            )}

            {history.length === 0 ? (
              <Empty icon="📜" title="작업 이력이 없어요" sub="수정사항이 반영되면 여기에 전/후 기록이 쌓입니다." />
            ) : filteredHistory.length === 0 ? (
              <Empty icon="🔍" title="검색 결과가 없어요" sub="검색어나 필터를 바꿔보세요." />
            ) : (
              <div className="timeline">
                {filteredHistory.map((h) => (
                  <div className="tl-item" key={h.id}>
                    <div
                      className="tl-dot"
                      style={{
                        background:
                          h.changeType === 'ADD' ? 'var(--green)' : h.changeType === 'REMOVE' ? 'var(--rose)' : 'var(--blue)',
                      }}
                    >
                      {h.changeType === 'ADD' ? '+' : h.changeType === 'REMOVE' ? '−' : '✎'}
                    </div>
                    <div>
                      <div className="tl-head">
                        <ChangeBadge type={h.changeType} />
                        {h.sourceType && <SourceBadge source={h.sourceType} />}
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          {h.taskTitle ?? (h.taskId ? `작업 #${h.taskId}` : '전체 작업')}
                        </span>
                        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                          담당: {h.assigneeName ?? '관리자'} · {fmtDate(h.createdAt)}
                        </span>
                      </div>
                      {(h.before || h.after) && (
                        <div className="tl-diff">
                          {h.before && (
                            <div className="tl-before">
                              <span className="tl-tag">전</span>
                              <span>{h.before}</span>
                            </div>
                          )}
                          {h.after && (
                            <div className="tl-after">
                              <span className="tl-tag">후</span>
                              <span>{h.after}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editOpen && (
        <Modal
          title="프로젝트 수정"
          subtitle="프로젝트 이름과 설명을 수정하세요."
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit || !editName.trim()}>
                {savingEdit ? <span className="spinner" /> : '저장'}
              </button>
              <button className="btn btn-soft" onClick={() => setEditOpen(false)}>
                취소
              </button>
            </>
          }
        >
          <div className="field">
            <label className="label">프로젝트명</label>
            <input
              className="input"
              value={editName}
              autoFocus
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            />
          </div>
          <div className="field">
            <label className="label">설명 (선택)</label>
            <textarea className="textarea" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">로고 (선택)</label>
            <div className="row" style={{ gap: 12 }}>
              {editLogo ? (
                <img className="logo-preview" src={editLogo} alt="" />
              ) : (
                <div className="logo-preview empty">+</div>
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
                        setEditLogo(await fileToDataUrl(f))
                      } catch (err) {
                        toast(err instanceof Error ? err.message : '이미지 오류', 'err')
                      }
                    }}
                  />
                </label>
                {editLogo && (
                  <button className="btn btn-soft btn-sm" onClick={() => setEditLogo(null)}>
                    제거
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {deleteConfirm && (
        <ConfirmModal
          icon="🗑"
          tone="danger"
          title="프로젝트 삭제"
          message={`'${project?.projectName}' 삭제하시겠습니까?`}
          confirmText="삭제"
          cancelText="취소"
          loading={deletingProject}
          onConfirm={deleteProject}
          onClose={() => (deletingProject ? null : setDeleteConfirm(false))}
        />
      )}

      {taskModal && (
        <TaskModal
          editing={taskModal.editing}
          onClose={() => setTaskModal(null)}
          onSave={saveTask}
        />
      )}
      {memberModal && (
        <MemberModal
          allUsers={users}
          members={members}
          onClose={() => setMemberModal(false)}
          onAddExisting={addExistingMember}
          onAddNew={addNewMember}
          onRemove={removeMember}
        />
      )}
      {finalConfirm && (
        <ConfirmModal
          icon="🏁"
          tone="success"
          title="최종 완료"
          message={'최종 완료 시 목록은 초기화 됩니다.\n작업 이력에는 완료 기록이 남습니다.'}
          confirmText="최종 완료"
          cancelText="취소"
          loading={finalizing}
          onConfirm={doFinalComplete}
          onClose={() => (finalizing ? null : setFinalConfirm(false))}
        />
      )}
      {taskToDelete && (
        <ConfirmModal
          icon="🗑"
          tone="danger"
          title="작업 삭제"
          message={`'${taskToDelete.title}' 작업을 삭제할까요?\n하위 작업도 함께 삭제됩니다.`}
          confirmText="삭제"
          cancelText="취소"
          loading={deletingTask}
          onConfirm={doRemoveTask}
          onClose={() => (deletingTask ? null : setTaskToDelete(null))}
        />
      )}
      {preview && (
        <PreviewModal
          tree={preview}
          sourceText={SOURCE_TEXT[mdSource]}
          loading={importing}
          onCancel={() => setPreview(null)}
          onConfirm={confirmImport}
        />
      )}
    </>
  )
}

/** AI 분석 결과 미리보기 — 불필요한 항목을 제거한 뒤 확정 */
function PreviewModal({
  tree,
  sourceText,
  loading,
  onCancel,
  onConfirm,
}: {
  tree: AiTaskTree
  sourceText: string
  loading: boolean
  onCancel: () => void
  onConfirm: (tree: AiTaskTree) => void
}) {
  const [nodes, setNodes] = useState<AiTaskNode[]>(tree.tasks ?? [])

  function removeAt(list: AiTaskNode[], path: number[]): AiTaskNode[] {
    if (path.length === 1) return list.filter((_, i) => i !== path[0])
    const [head, ...rest] = path
    return list.map((n, i) => (i === head ? { ...n, children: removeAt(n.children ?? [], rest) } : n))
  }

  const count = (list: AiTaskNode[]): number =>
    list.reduce((sum, n) => sum + 1 + count(n.children ?? []), 0)

  const renderNodes = (list: AiTaskNode[], parentPath: number[], depth: number) =>
    list.map((n, i) => {
      const path = [...parentPath, i]
      return (
        <Fragment key={path.join('-')}>
          <div className="preview-row" style={{ marginLeft: depth * 18 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="preview-title">
                {depth > 0 && <span style={{ color: 'var(--text-3)', marginRight: 5 }}>↳</span>}
                {n.title}
              </div>
              {n.description && <div className="preview-desc">{n.description}</div>}
            </div>
            <button className="icon-btn danger" title="제외" onClick={() => setNodes((prev) => removeAt(prev, path))}>
              ✕
            </button>
          </div>
          {n.children && renderNodes(n.children, path, depth + 1)}
        </Fragment>
      )
    })

  return (
    <Modal
      title="AI 분석 결과 미리보기"
      subtitle={`출처: ${sourceText} · 불필요한 항목은 ✕로 제외한 뒤 확정하세요`}
      wide
      onClose={onCancel}
      footer={
        <>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm({ tasks: nodes })}
            disabled={loading || nodes.length === 0}
          >
            {loading ? <span className="spinner" /> : `확정 (${count(nodes)}개 추가)`}
          </button>
          <button className="btn btn-soft" onClick={onCancel} disabled={loading}>
            취소
          </button>
        </>
      }
    >
      {nodes.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 20 }}>
          모든 항목을 제외했습니다.
        </div>
      ) : (
        <div className="preview-list">{renderNodes(nodes, [], 0)}</div>
      )}
    </Modal>
  )
}

function TaskModal({
  editing,
  onClose,
  onSave,
}: {
  editing: Task | null
  onClose: () => void
  onSave: (title: string, description: string, dueDate: string | null) => void
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [desc, setDesc] = useState(editing?.description ?? '')
  // 새 작업은 마감일 기본값 = 1주일 뒤, 수정 시엔 기존 값
  const [due, setDue] = useState(editing ? (editing.dueDate ?? '') : addDaysString(7))
  return (
    <Modal
      title={editing ? '작업 수정' : '새 작업'}
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-primary"
            onClick={() => onSave(title.trim(), desc.trim(), due || null)}
            disabled={!title.trim()}
          >
            저장
          </button>
          <button className="btn btn-soft" onClick={onClose}>
            취소
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">작업명</label>
        <input className="input" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="예: 회원 검색" />
      </div>
      <div className="field">
        <label className="label">세부사항 (선택)</label>
        <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="예: 이름/이메일/기간 검색" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label">마감일 (선택)</label>
        <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
    </Modal>
  )
}

function MemberModal({
  allUsers,
  members,
  onClose,
  onAddExisting,
  onAddNew,
  onRemove,
}: {
  allUsers: User[]
  members: User[]
  onClose: () => void
  onAddExisting: (userId: number) => void
  onAddNew: (name: string) => void
  onRemove: (userId: number) => void
}) {
  const [name, setName] = useState('')
  const memberIds = new Set(members.map((m) => m.id))
  // 관리자는 기본값이므로 담당자 추가 목록에서 제외
  const candidates = allUsers.filter((u) => !memberIds.has(u.id) && u.role !== 'ADMIN')

  return (
    <Modal
      title="담당자 관리"
      subtitle="기존 사용자를 추가하거나 새 담당자를 만들어 이 프로젝트에 배정하세요."
      onClose={onClose}
      footer={
        <button className="btn btn-primary" onClick={onClose}>
          완료
        </button>
      }
    >
      {/* 현재 담당자 */}
      <div className="label" style={{ marginBottom: 8 }}>현재 담당자 ({members.length})</div>
      {members.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>아직 담당자가 없습니다.</div>
      ) : (
        <div className="row wrap" style={{ gap: 8, marginBottom: 18 }}>
          {members.map((m) => (
            <span key={m.id} className="member-chip">
              <span className="a-av">{m.name.slice(0, 1).toUpperCase()}</span>
              {m.name}
              <button className="chip-x" title="제외" onClick={() => onRemove(m.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* 기존 사용자 추가 */}
      <div className="label" style={{ marginBottom: 8 }}>사용자 목록에서 추가</div>
      {candidates.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, marginBottom: 18 }}>추가할 수 있는 다른 사용자가 없습니다.</div>
      ) : (
        <div className="stack" style={{ gap: 6, marginBottom: 18, maxHeight: 180, overflowY: 'auto' }}>
          {candidates.map((u) => (
            <div key={u.id} className="row between user-pick">
              <span className="row" style={{ gap: 8 }}>
                <span className="a-av">{u.name.slice(0, 1).toUpperCase()}</span>
                {u.name}
              </span>
              <button className="btn btn-soft btn-sm" onClick={() => onAddExisting(u.id)}>추가</button>
            </div>
          ))}
        </div>
      )}

      {/* 새 담당자 생성 */}
      <div className="label" style={{ marginBottom: 8 }}>새 담당자 만들기</div>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              onAddNew(name.trim())
              setName('')
            }
          }}
          placeholder="새 이름 입력 후 추가"
        />
        <button
          className="btn btn-primary"
          disabled={!name.trim()}
          onClick={() => {
            onAddNew(name.trim())
            setName('')
          }}
        >
          추가
        </button>
      </div>
    </Modal>
  )
}
