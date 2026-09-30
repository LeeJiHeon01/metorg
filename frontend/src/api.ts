// 백엔드 REST API 호출 헬퍼. vite proxy 를 통해 /api → localhost:8080 으로 전달된다.

export type User = {
  id: number
  username?: string | null
  name: string
  role?: string
  createdAt: string
}

export type Project = {
  id: number
  projectName: string
  description?: string
  createdBy?: number
  logo?: string | null
  createdAt: string
  updatedAt: string
}

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'REVIEW_REQUESTED'
  | 'NEEDS_FIX'
  | 'DONE'

export type Task = {
  id: number
  projectId: number
  parentTaskId?: number | null
  title: string
  description?: string | null
  status: TaskStatus
  assigneeId?: number | null
  sortOrder?: number
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}

export type AiTaskNode = { title: string; description?: string; children?: AiTaskNode[] }
export type AiTaskTree = { tasks: AiTaskNode[] }

export type SourceType = 'MEETING' | 'TEST' | 'CUSTOMER'
export type ChangeType = 'ADD' | 'UPDATE' | 'REMOVE'

export type ChangeRequest = {
  id: number
  sourceType: SourceType
  content: string
  createdBy?: number
  createdAt: string
}

export type ChangeHistory = {
  id: number
  projectId: number
  taskId?: number
  taskTitle?: string | null
  assigneeName?: string | null
  changeId?: number
  sourceType?: SourceType | null
  before?: string | null
  after?: string | null
  changeType: ChangeType
  createdAt: string
}

export type AiChange = {
  type: ChangeType
  taskId?: number
  parentTaskId?: number
  title?: string
  before?: string
  after?: string
  description?: string
}

export type ApplyResult = {
  changeRequestId: number
  appliedCount: number
  histories: ChangeHistory[]
  tasks: Task[]
}

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    http<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signup: (username: string, password: string, name?: string) =>
    http<User>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, password, name }) }),
  changePassword: (userId: number, currentPassword: string, newPassword: string) =>
    http<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    }),
  updateProfile: (userId: number, name: string) =>
    http<User>('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ userId, name }) }),
  updateUserRole: (id: number, role: string) =>
    http<User>(`/api/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

  // Users (전역 사용자 풀)
  listUsers: () => http<User[]>('/api/users'),
  createUser: (name: string) =>
    http<User>('/api/users', { method: 'POST', body: JSON.stringify({ name }) }),

  // Project members (프로젝트별 팀원)
  listMembers: (projectId: number) => http<User[]>(`/api/projects/${projectId}/members`),
  addMemberExisting: (projectId: number, userId: number) =>
    http<User>(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  addMemberNew: (projectId: number, name: string) =>
    http<User>(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ name }) }),
  removeMember: (projectId: number, userId: number) =>
    http<void>(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  // Projects
  listProjects: (userId?: number) =>
    http<Project[]>(`/api/projects${userId != null ? `?userId=${userId}` : ''}`),
  getProject: (id: number) => http<Project>(`/api/projects/${id}`),
  createProject: (data: { projectName: string; description?: string; createdBy?: number; logo?: string | null }) =>
    http<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: { projectName: string; description?: string; logo?: string | null }) =>
    http<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) => http<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  bulkDeleteProjects: (ids: number[]) =>
    http<{ deleted: number }>('/api/projects/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Tasks
  listTasks: (projectId: number) => http<Task[]>(`/api/projects/${projectId}/tasks`),
  createTask: (
    projectId: number,
    data: {
      title: string
      description?: string
      parentTaskId?: number | null
      assigneeId?: number | null
      dueDate?: string | null
    },
  ) => http<Task>(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (
    id: number,
    data: {
      title: string
      description?: string | null
      status?: TaskStatus
      assigneeId?: number | null
      parentTaskId?: number | null
      sortOrder?: number
      dueDate?: string | null
    },
  ) => http<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) => http<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  completeAllTasks: (projectId: number) =>
    http<Task[]>(`/api/projects/${projectId}/tasks/complete-all`, { method: 'POST' }),
  undoFinalize: (projectId: number) =>
    http<{ restored: number }>(`/api/projects/${projectId}/tasks/undo-finalize`, { method: 'POST' }),
  bulkAssign: (taskIds: number[], assigneeId: number | null) =>
    http<{ updated: number }>(`/api/tasks/bulk-assign`, {
      method: 'POST',
      body: JSON.stringify({ taskIds, assigneeId }),
    }),

  // AI: MD/TXT 분석만 (저장 X, 미리보기용). API 키 필요
  analyzeMarkdown: async (projectId: number, file: File): Promise<AiTaskTree> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/projects/${projectId}/tasks/analyze-md`, { method: 'POST', body: form })
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`
      try {
        const b = await res.json()
        if (b?.error) msg = b.error
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    return res.json()
  },

  // 확정된 작업 트리 저장 (+ 출처를 변경이력에 기록)
  importTree: (projectId: number, tree: AiTaskTree, sourceType?: SourceType, createdBy?: number) =>
    http<Task[]>(`/api/projects/${projectId}/tasks/import-tree`, {
      method: 'POST',
      body: JSON.stringify({ tree, sourceType, createdBy }),
    }),

  // 수정사항 → Claude 비교 → 자동 반영 (ANTHROPIC_API_KEY 필요)
  submitChangeRequest: (
    projectId: number,
    data: { sourceType: SourceType; content: string; createdBy?: number },
  ) =>
    http<ApplyResult>(`/api/projects/${projectId}/change-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Change history / requests
  listChangeHistory: (projectId: number) =>
    http<ChangeHistory[]>(`/api/projects/${projectId}/change-history`),
  listChangeRequests: (projectId: number) =>
    http<ChangeRequest[]>(`/api/projects/${projectId}/change-requests`),
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: '미진행',
  IN_PROGRESS: '진행중',
  REVIEW_REQUESTED: '재확인요청',
  NEEDS_FIX: '수정필요',
  DONE: '진행완료',
}

export const SOURCE_LABEL: Record<SourceType, string> = {
  MEETING: '회의',
  TEST: '테스트',
  CUSTOMER: '고객 요청',
}

export const CHANGE_LABEL: Record<ChangeType, string> = {
  ADD: '추가',
  UPDATE: '수정',
  REMOVE: '제외',
}
