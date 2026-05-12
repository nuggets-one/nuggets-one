import 'server-only'
import { createHash } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const MAX_INPUT_CHARS = 600

const SCHEMA: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: ['p', 'em', 'strong', 'code', 'a', 'ul', 'ol', 'li', 'blockquote', 'br'],
  attributes: {
    a: ['href'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, SCHEMA)
  .use(rehypeStringify)

function truncateAtWordBoundary(value: string, max: number): string {
  if (value.length <= max) return value
  const cut = value.slice(0, max).replace(/\s+\S*$/, '')
  return (cut || value.slice(0, max)).trimEnd()
}

function hashKey(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}

async function compile(markdown: string): Promise<string> {
  const file = await processor.process(markdown)
  return String(file)
}

export async function renderCardPreviewMarkdown(markdown: string | null | undefined): Promise<string> {
  if (!markdown) return ''

  const trimmed = truncateAtWordBoundary(markdown.trim(), MAX_INPUT_CHARS)
  if (!trimmed) return ''

  const key = hashKey(trimmed)
  const cached = unstable_cache(
    async () => compile(trimmed),
    ['card-preview-html', key],
    { revalidate: 86400 }
  )

  return cached()
}

/**
 * Attach `cardPreviewHtml` to each article via the markdown JIT pipeline.
 * Runs in parallel so per-card rendering is concurrent, not serial.
 *
 * Called by every query path that produces ArticleCardProps:
 *   - getFeedPage (lib/queries/feed.ts)
 *   - getBookmarkedArticles (lib/queries/bookmarks.ts)
 *   - getCollectionArticles (lib/queries/collections.ts)
 *
 * Keeps ArticleCard a sync Server Component so it can render inside
 * client trees (e.g. FeedPager).
 */
export async function attachCardPreviewHtml<T extends { card_preview: string | null }>(
  articles: T[]
): Promise<Array<T & { cardPreviewHtml: string }>> {
  return Promise.all(
    articles.map(async (article) => ({
      ...article,
      cardPreviewHtml: await renderCardPreviewMarkdown(article.card_preview),
    }))
  )
}
