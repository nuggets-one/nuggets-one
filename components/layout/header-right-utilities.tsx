'use client'

// S1-F3: single client island for header right cluster (create · theme · bell · avatar).
// One /api/auth/status fetch; server Header stays cookie-free.

import { type ReactNode } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { LogIn, Sparkles } from 'lucide-react'
import { useAuthStatus, type AuthStatusState } from '@/components/layout/auth-status-provider'
import { logoutAction } from '@/lib/actions/auth'
import type { LegalFooterLink } from '@/lib/queries/legal-pages'
import { accountAvatarLetter } from '@/lib/ui/account-avatar-initial'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const NotificationPanel = dynamic(
  () =>
    import('@/components/notifications/NotificationPanel').then((m) => ({
      default: m.NotificationPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-11 min-w-11 rounded-lg bg-surface-raised animate-pulse md:h-9 md:w-9 md:min-h-0 md:min-w-0" aria-hidden="true" />
    ),
  }
)

type AuthState = AuthStatusState

function CreateNuggetHeaderLink() {
  return (
    <Link
      href="/admin/articles/new"
      data-testid="create-nugget-button"
      aria-label="Create Nugget"
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:size-9 md:min-h-0 md:min-w-0"
    >
      <Sparkles className="size-4 text-yellow-500" aria-hidden />
    </Link>
  )
}

function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </p>
  )
}

function LegalMenuBlock({ legalLinks }: { legalLinks: readonly LegalFooterLink[] }) {
  const year = new Date().getFullYear()

  return (
    <nav aria-label="Legal" className="border-t border-border px-4 py-2">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {legalLinks.map((item) => (
          <Link
            key={item.slug}
            href={`/legal/${item.slug}`}
            role="menuitem"
            className="inline-flex rounded-sm text-[11px] font-normal leading-snug text-muted underline-offset-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-1 focus-visible:ring-offset-rail"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-muted">© {year} Nuggets</p>
    </nav>
  )
}

function AnonymousAccountMenu({ legalLinks }: { legalLinks: readonly LegalFooterLink[] }) {
  return (
    <details className="group relative">
      <summary
        aria-label="Sign in"
        className="list-none [&::-webkit-details-marker]:hidden inline-flex cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus/60 [&:-moz-focusring]:outline-none"
      >
        <span className="inline-flex min-h-11 min-w-11 select-none items-center justify-center rounded-full bg-gray-900 p-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
          <LogIn className="size-[18px]" strokeWidth={2} aria-hidden />
        </span>
      </summary>

      <div
        role="menu"
        className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-xl border border-border bg-rail py-2 shadow-panel ring-1 ring-elevated"
      >
        <Link
          href="/login"
          role="menuitem"
          className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          role="menuitem"
          className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
        >
          Create account
        </Link>

        <LegalMenuBlock legalLinks={legalLinks} />
      </div>
    </details>
  )
}

function AuthenticatedAccountMenu({
  auth,
  legalLinks,
}: {
  auth: Extract<AuthState, { status: 'authenticated' }>
  legalLinks: readonly LegalFooterLink[]
}) {
  const initials = accountAvatarLetter(auth.displayName, auth.email)

  return (
    <details className="group relative">
      <summary
        aria-label="Open account menu"
        className="list-none [&::-webkit-details-marker]:hidden inline-flex cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus/60 [&:-moz-focusring]:outline-none"
      >
        <span className="inline-flex min-h-11 min-w-11 select-none items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover active:bg-accent-hover md:size-9 md:min-h-0 md:min-w-0">
          {initials}
        </span>
      </summary>

      <div
        role="menu"
        className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-xl border border-border bg-rail py-2 shadow-panel ring-1 ring-elevated"
      >
        {auth.email ? (
          <>
            <MenuHeading>Signed in as</MenuHeading>
            <p className="-mt-2 line-clamp-2 break-all px-3 pb-2 text-xs text-muted">
              {auth.email}
            </p>
          </>
        ) : null}

        <Link
          href="/bookmarks"
          role="menuitem"
          className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
        >
          Bookmarks
        </Link>

        <Link
          href="/collections"
          role="menuitem"
          className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
        >
          Collections
        </Link>

        <Link
          href="/account"
          role="menuitem"
          className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
        >
          Account settings
        </Link>

        {auth.isAdmin ? (
          <>
            <Link
              href="/admin/articles"
              role="menuitem"
              className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
            >
              Admin
            </Link>
            <Link
              href="/admin/articles/new"
              role="menuitem"
              className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
            >
              Create nugget
            </Link>
          </>
        ) : null}

        <LegalMenuBlock legalLinks={legalLinks} />

        <div className="my-2 border-t border-border" />

        <form action={logoutAction} role="presentation">
          <button
            type="submit"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  )
}

type Props = {
  legalLinks: readonly LegalFooterLink[]
}

export function HeaderRightUtilities({ legalLinks }: Props) {
  const auth = useAuthStatus()

  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
      {auth.status === 'authenticated' && auth.isAdmin ? <CreateNuggetHeaderLink /> : null}

      <ThemeToggle />

      {auth.status === 'loading' ? (
        <div
          className="h-8 w-16 rounded-lg bg-surface-raised animate-pulse"
          aria-hidden="true"
        />
      ) : auth.status === 'anonymous' ? (
        <AnonymousAccountMenu legalLinks={legalLinks} />
      ) : auth.status === 'authenticated' ? (
        <>
          <NotificationPanel />
          <AuthenticatedAccountMenu auth={auth} legalLinks={legalLinks} />
        </>
      ) : null}
    </div>
  )
}
