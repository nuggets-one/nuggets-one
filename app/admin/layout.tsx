import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Per admin CLAUDE.md: always call getUser() — never trust session alone.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.app_metadata?.is_admin !== true) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="flex h-12 items-center gap-6 border-b border-border bg-header px-6 backdrop-blur-sm">
        <span className="font-semibold text-sm text-primary">Admin</span>
        <Link href="/admin/articles" className="text-sm text-muted hover:text-primary transition-colors">Articles</Link>
        <Link href="/admin/tags" className="text-sm text-muted hover:text-primary transition-colors">Tags</Link>
        <Link
          href="/admin/articles/new"
          className="text-sm text-muted hover:text-primary transition-colors"
        >
          Create nugget
        </Link>
        <Link href="/" className="ml-auto text-sm text-muted hover:text-primary transition-colors">← Site</Link>
      </nav>
      <main className="mx-auto w-full max-w-screen-2xl px-6 py-6">
        {children}
      </main>
    </div>
  )
}
