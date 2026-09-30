type Tone = 'primary' | 'success' | 'danger'

type Props = {
  icon?: string
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: Tone
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  icon = '❓',
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  tone = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const confirmClass =
    tone === 'success' ? 'btn-success' : tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-body">
          <div className={`confirm-icon tone-${tone}`}>{icon}</div>
          <div className="confirm-title">{title}</div>
          <div className="confirm-msg">{message}</div>
        </div>
        <div className="modal-foot" style={{ justifyContent: 'center' }}>
          <button className={`btn ${confirmClass}`} onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner" /> : confirmText}
          </button>
          <button className="btn btn-soft" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
