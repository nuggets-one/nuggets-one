import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { DEFAULT_STREAM, FEED_PAGE_SIZE } from '@/types/article'

export const dynamic = 'force-dynamic'

export default async function QueriesTestPage() {
  const [feedResult, tags] = await Promise.all([
    getFeedPage({ stream: DEFAULT_STREAM }).catch((e: Error) => ({
      error: e.message,
    })),
    listOfficialTags().catch((e: Error) => ({
      error: e.message,
    })),
  ])

  const feedError = 'error' in feedResult ? feedResult.error : null
  const tagsError = 'error' in tags ? tags.error : null
  const feed = 'articles' in feedResult ? feedResult : null

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13 }}>
      <h1>Query smoke test</h1>

      <h2>getFeedPage (stream: standard)</h2>
      {feedError ? (
        <pre style={{ color: 'red' }}>ERROR: {feedError}</pre>
      ) : (
        <>
          <p>articles returned: {feed?.articles.length ?? 0}
             (0 = no seed data, OK)</p>
          <p>nextCursor: {feed?.nextCursor ? 'present' : 'null'}</p>
          <p>page size constant: {FEED_PAGE_SIZE}</p>
          {feed?.articles[0] && (
            <details>
              <summary>First article fields (verify no
                content_markdown)</summary>
              <pre>{JSON.stringify(
                Object.keys(feed.articles[0]), null, 2
              )}</pre>
            </details>
          )}
        </>
      )}

      <h2>listOfficialTags</h2>
      {tagsError ? (
        <pre style={{ color: 'red' }}>ERROR: {tagsError}</pre>
      ) : (
        <p>tags returned: {(tags as any[]).length}
           (0 = no seed data, OK)</p>
      )}

      <hr />
      <p style={{ color: 'gray' }}>
        This page is temporary — delete before PR-06.
      </p>
    </div>
  )
}
