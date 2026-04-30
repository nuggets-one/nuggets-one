import Link from 'next/link'
import { logoutAction } from '@/lib/actions/auth'

type HeaderAuthProps = {
  isAuthenticated: boolean
  userEmail?: string | null
}

export function HeaderAuth({ isAuthenticated, userEmail }: HeaderAuthProps) {
  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center rounded-md px-2 text-sm text-muted transition-colors hover:text-primary active:bg-surface-raised"
      >
        Sign in
      </Link>
    )
  }

  // Authenticated state — minimal avatar + logout
  // Bell/notifications added in later PR (§6.6)
  const initials = (userEmail ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="shrink-0 flex items-center gap-2 sm:gap-3">
      <form action={logoutAction} className="hidden md:block">
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-md px-2 text-sm text-muted transition-colors hover:text-primary active:bg-surface-raised"
        >
          Sign out
        </button>
      </form>
      <Link
        href="/account"
        aria-label="Account settings"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white text-xs font-semibold select-none hover:bg-accent/90 transition-colors"
      >
        {initials}
      </Link>
    </div>
  )
}
