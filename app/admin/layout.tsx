import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Per admin CLAUDE.md: always call getUser() — never trust session alone.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.app_metadata?.is_admin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border bg-surface px-6 h-12 flex items-center gap-6">
        <span className="font-semibold text-sm text-primary">Admin</span>
        <Link href="/admin/articles" className="text-sm text-muted hover:text-primary transition-colors">Articles</Link>
        <Link href="/admin/tags" className="text-sm text-muted hover:text-primary transition-colors">Tags</Link>
        <Link href="/" className="ml-auto text-sm text-muted hover:text-primary transition-colors">← Site</Link>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
