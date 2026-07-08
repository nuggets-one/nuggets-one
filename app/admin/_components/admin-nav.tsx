'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const ADMIN_LINKS = [
  { href: '/admin/articles', label: 'Articles' },
  { href: '/admin/tags', label: 'Tags' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/legal-pages', label: 'Legal pages' },
  { href: '/admin/site-copy', label: 'Site copy' },
  { href: '/admin/articles/new', label: 'Create nugget' },
] as const

function AdminNavLink({
  href,
  label,
  onNavigate,
}: {
  href: string
  label: string
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="shrink-0 text-sm text-muted transition-colors hover:text-primary"
    >
      {label}
    </Link>
  )
}

export function AdminNav() {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const details = detailsRef.current
      if (!details?.open) return
      if (details.contains(e.target as Node)) return
      details.open = false
    }

    function handleEscape(e: KeyboardEvent) {
      const details = detailsRef.current
      if (e.key === 'Escape' && details?.open) details.open = false
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function closeMenu() {
    const details = detailsRef.current
    if (details) details.open = false
  }

  return (
    <nav
      data-testid="admin-nav"
      className="sticky top-0 z-50 border-b border-border bg-header pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm"
    >
      <div className="flex h-12 items-center gap-4 px-4 sm:px-6">
        <span className="shrink-0 font-semibold text-sm text-primary">Admin</span>

        <div className="hidden min-w-0 flex-1 items-center gap-6 overflow-x-auto lg:flex">
          {ADMIN_LINKS.map((link) => (
            <AdminNavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </div>

        <details ref={detailsRef} className="group relative lg:hidden">
          <summary
            className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-primary [&::-webkit-details-marker]:hidden"
            aria-label="Admin menu"
          >
            <Menu className="size-5 group-open:hidden" aria-hidden />
            <X className="hidden size-5 group-open:block" aria-hidden />
          </summary>
          <div className="absolute left-0 top-full z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-2 shadow-panel">
            <ul className="space-y-0.5">
              {ADMIN_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className="flex min-h-11 items-center rounded-lg px-3 text-sm text-primary transition-colors hover:bg-surface-raised"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <Link
          href="/"
          className="ml-auto shrink-0 text-sm text-muted transition-colors hover:text-primary"
        >
          ← Site
        </Link>
      </div>
    </nav>
  )
}
