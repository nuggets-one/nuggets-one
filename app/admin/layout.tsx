import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already rejects unauthenticated users; this gate checks is_admin.
  // Per admin CLAUDE.md: always call getUser() — never trust session alone.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.app_metadata?.is_admin) {
    redirect('/')
  }

  return <>{children}</>
}
