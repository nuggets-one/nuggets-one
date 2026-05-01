import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms — Nuggets',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-semibold text-primary">Terms of use</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        This page is a placeholder. Replace with counsel-approved Terms before linking it
        from production marketing or sign-up flows.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/" className="font-medium text-primary underline underline-offset-2">
          Back to Home
        </Link>
      </p>
    </div>
  )
}
