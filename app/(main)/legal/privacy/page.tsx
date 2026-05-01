import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy — Nuggets',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-semibold text-primary">Privacy policy</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        This page is a placeholder. Replace with a privacy policy suited to Supabase/Vercel
        data flows before exposing it broadly.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/" className="font-medium text-primary underline underline-offset-2">
          Back to Home
        </Link>
      </p>
    </div>
  )
}
