import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  heading: string
  body?: string
  linkHref?: string
  linkLabel?: string
  children?: ReactNode
}

export function StatusBlock({ heading, body, linkHref, linkLabel, children }: Props) {
  return (
    <div className="py-20 text-center">
      <p className="text-base font-semibold text-primary mb-1">{heading}</p>
      {body && <p className="text-sm text-muted mt-1">{body}</p>}
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-2"
        >
          {linkLabel}
        </Link>
      )}
      {children}
    </div>
  )
}
