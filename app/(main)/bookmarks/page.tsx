import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getBookmarkedArticles } from '@/lib/queries/bookmarks'
import { ArticleCard } from '@/components/ui/article-card'
import { StatusBlock } from '@/components/ui/status-block'
import { createClient } from '@/lib/supabase/server'

// Bookmarks are user-specific — never ISR
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bookmarks',
}

export default async function BookmarksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // S7-F5: defense-in-depth — proxy also redirects, but page must not render for anon
  if (!user) {
    redirect('/login?next=/bookmarks')
  }

  const articles = await getBookmarkedArticles()
  const isAdmin = user.app_metadata?.is_admin === true

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Bookmarks</h1>
        <p className="text-sm text-muted mt-1">Your saved nuggets</p>
      </div>

      {articles.length === 0 ? (
        <StatusBlock
          heading="Nothing saved yet."
          body="Bookmark nuggets from Home to revisit them here."
          linkHref="/"
          linkLabel="Browse Home"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0}
              isAuthenticated={!!user}
              initialBookmarked={true}
              adminEditHref={isAdmin ? `/admin/articles/${article.id}` : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
