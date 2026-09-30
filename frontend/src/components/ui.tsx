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

export function fmtDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
