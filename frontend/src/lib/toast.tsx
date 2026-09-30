import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'ok' | 'err' | 'info'
type ToastState = { msg: string; kind: ToastKind } | null

const Ctx = createContext<(msg: string, kind?: ToastKind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)

  const show = useCallback((msg: string, kind: ToastKind = 'info') => {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind}`}>
          <span>{toast.kind === 'ok' ? '✅' : toast.kind === 'err' ? '⚠️' : '💬'}</span>
          {toast.msg}
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
