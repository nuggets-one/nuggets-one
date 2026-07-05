'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { readResponseJson } from '@/lib/http/parse-json-response'
import { subscribeAuthChanges } from '@/lib/auth/browser-auth-events'

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

export function AuthStatusProvider({
  children,
  initialStatus,
}: {
  children: ReactNode
  initialStatus?: AuthStatusState
}) {
  const [auth, setAuth] = useState<AuthStatusState>(
    initialStatus ?? { status: 'loading' }
  )
  const hydratedFromServer =
    initialStatus != null && initialStatus.status !== 'loading'

  useEffect(() => {
    let cancelled = false

    async function refreshFromServer() {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setAuth({ status: 'anonymous' })
          return
        }
        const data = await readResponseJson<AuthStatusResponse>(res)
        if (cancelled) return
        if (data?.authenticated) {
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
      } catch {
        if (!cancelled) setAuth({ status: 'anonymous' })
      }
    }

    // Only fetch on mount if the server did not hydrate us.
    if (!hydratedFromServer) {
      void refreshFromServer()
    }

    // React to real auth changes (login/logout/token refresh) instead of
    // polling. Supabase replays INITIAL_SESSION on subscribe — skip it since
    // server hydration (or the fetch above) already set the correct state.
    const unsubscribe = subscribeAuthChanges(({ event, authenticated }) => {
      if (event === 'INITIAL_SESSION') return
      if (!authenticated) {
        setAuth({ status: 'anonymous' })
      } else {
        void refreshFromServer()
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [hydratedFromServer])

  return <AuthStatusContext.Provider value={auth}>{children}</AuthStatusContext.Provider>
}
