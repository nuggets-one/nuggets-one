'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { readResponseJson } from '@/lib/http/parse-json-response'

export type AuthStatusState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | {
      status: 'authenticated'
      email: string | null
      displayName: string | null
      isAdmin: boolean
    }

type AuthStatusResponse = {
  authenticated?: boolean
  email?: string | null
  displayName?: string | null
  isAdmin?: boolean
}

const AuthStatusContext = createContext<AuthStatusState>({ status: 'loading' })

export function useAuthStatus(): AuthStatusState {
  return useContext(AuthStatusContext)
}

export function AuthStatusProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthStatusState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 4000)

    fetch('/api/auth/status', { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return { authenticated: false as const }
        const data = await readResponseJson<AuthStatusResponse>(res)
        return data ?? { authenticated: false as const }
      })
      .then((data) => {
        if (cancelled) return
        if (data.authenticated) {
          setAuth({
            status: 'authenticated',
            email: data.email ?? null,
            displayName:
              typeof data.displayName === 'string' && data.displayName.trim()
                ? data.displayName.trim()
                : null,
            isAdmin: data.isAdmin === true,
          })
        } else {
          setAuth({ status: 'anonymous' })
        }
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: 'anonymous' })
      })
      .finally(() => {
        clearTimeout(timeout)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return <AuthStatusContext.Provider value={auth}>{children}</AuthStatusContext.Provider>
}
