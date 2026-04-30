import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getBookmarkedArticles } from '@/lib/queries/bookmarks'
import { ArticleCard } from '@/components/ui/article-card'
import { createClient } from '@/lib/supabase/server'

// Bookmarks are user-specific — never ISR
export const dynamic = 'force-dynamic'

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Bookmarks</h1>
        <p className="text-sm text-muted mt-1">Your saved nuggets</p>
      </div>

      {articles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-base font-semibold text-primary mb-1">Nothing saved yet.</p>
          <p className="text-sm text-muted mb-6">
            Bookmark nuggets from Home to revisit them here.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Browse Home
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0}
              isAuthenticated={!!user}
              initialBookmarked={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
