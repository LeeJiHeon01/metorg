import { type ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export default function Modal({ title, subtitle, onClose, children, footer, wide }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-h">{title}</div>
          {subtitle && <div className="modal-p">{subtitle}</div>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
