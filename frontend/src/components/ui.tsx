import { STATUS_LABEL, SOURCE_LABEL, CHANGE_LABEL, type TaskStatus, type SourceType, type ChangeType } from '../api'

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`badge st-${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function SourceBadge({ source }: { source: SourceType }) {
  return <span className={`badge src-${source}`}>{SOURCE_LABEL[source]}</span>
}

export function ChangeBadge({ type }: { type: ChangeType }) {
  return <span className={`badge chg-${type}`}>{CHANGE_LABEL[type]}</span>
}

export function Avatar({ name, small }: { name: string; small?: boolean }) {
  const text = name.trim().slice(0, small ? 1 : 2).toUpperCase()
  return <span className={small ? 'a-av' : 'avatar'}>{text}</span>
}

export function Empty({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  )
}

/** 이미지 파일을 data URL(base64)로 읽음. 5MB 초과 시 에러 */
export function fileToDataUrl(file: File, maxBytes = 5 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 등록할 수 있어요'))
      return
    }
    if (file.size > maxBytes) {
      reject(new Error('이미지는 5MB 이하만 가능해요'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('이미지 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

export function fmtDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
