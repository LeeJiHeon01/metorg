import { createContext, useContext, useState, type ReactNode } from 'react'

export type CurrentUser = { id: number; username?: string; name: string; role: string }

export const isAdmin = (u: CurrentUser | null) => u?.role === 'ADMIN'

type UserCtx = {
  user: CurrentUser | null
  setUser: (u: CurrentUser | null) => void
}

const Ctx = createContext<UserCtx>({ user: null, setUser: () => {} })
const KEY = 'mo_user'

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<CurrentUser | null>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as CurrentUser) : null
    } catch {
      return null
    }
  })

  const setUser = (u: CurrentUser | null) => {
    setUserState(u)
    if (u) localStorage.setItem(KEY, JSON.stringify(u))
    else localStorage.removeItem(KEY)
  }

  return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>
}

export const useUser = () => useContext(Ctx)

export function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase()
}
