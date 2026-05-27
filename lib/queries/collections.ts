import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { getPublicClient } from '@/lib/supabase/public'
import { normalizeCuratorDisplayNameOnRows } from '@/lib/queries/normalize-curator-display-name'
import { attachTagLabelsToRows } from '@/lib/queries/card-tag-labels'
import type { SupabaseLike } from '@/lib/queries/card-tag-labels'
import { attachCardPreviewHtml } from '@/lib/ui/card-preview-markdown'
import type {
  CollectionSummary,
  CollectionDetail,
  CollectionTopicGroup,
  CollectionsBrowseOptions,
  CollectionsBrowseResult,
  CollectionsSort,
} from '@/types/collection'
import {
  normalizeHeroMediaKind,
  type ArticleCardProps,
} from '@/types/article'

// Phase 14: collections doesn't fetch `article_media`; cards stay single-hero.
// `images: []` is appended in the mapping step below.
type ArticleRowWithoutImages = Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels'>
type ArticleRowBase = Omit<ArticleCardProps, 'cardPreviewHtml' | 'tag_labels'>
type ArticleRowWithLabels = Omit<ArticleCardProps, 'cardPreviewHtml'>
type TaggableRow = Record<string, unknown> & { tag_slugs: string[] }

type CollectionEntryRow = {
  position: number
  articles: ArticleRowWithoutImages | null
}

type CollectionListRow = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_image_url?: string | null
  created_at: string
  parent_id?: string | null
  is_featured?: boolean
  featured_order?: number | null
  community_collection_entries?: Array<{
    position: number
    articles: { hero_thumb_url: string | null } | null
  }>
}

type CollectionDetailRow = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_image_url?: string | null
  created_at: string
  parent_id?: string | null
  community_collection_entries?: CollectionEntryRow[]
}

export type CollectionArticlesWindow = {
  articles: ArticleCardProps[]
  next_cursor: string | null
}

export type CollectionDetailShell = Omit<CollectionDetail, 'articles'>

type CollectionArticlesCursor = {
  publishedAt: string
  articleId: string
}

// ─── Cover derivation ─────────────────────────────────────────────────
// BLUEPRINT §12.3: cover_image_url → first ordered entry hero → null
function deriveCover(
  coverImageUrl: string | null,
  entries: Array<{ position: number; articles: { hero_thumb_url: string | null } | null }>
): string | null {
  if (coverImageUrl) return coverImageUrl
  const sorted = [...entries].sort((a, b) => a.position - b.position)
  return sorted.find((e) => e.articles?.hero_thumb_url)?.articles?.hero_thumb_url ?? null
}

// ─── List ─────────────────────────────────────────────────────────────

function isMissingParentIdColumnError(message: string): boolean {
  return /parent_id/i.test(message) && /does not exist/i.test(message)
}

function mapRowToSummary(row: CollectionListRow): CollectionSummary {
  const entries: Array<{ position: number; articles: { hero_thumb_url: string | null } | null }> =
    row.community_collection_entries ?? []
  const direct = entries.length

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    curator_name: row.curator_name as string,
    cover_url: deriveCover((row.cover_image_url ?? null) as string | null, entries),
    created_at: row.created_at as string,
    direct_entry_count: direct,
    aggregate_entry_count: direct,
    entry_count: direct,
    child_count: 0,
    parent_id: (row.parent_id ?? null) as string | null,
    is_featured: row.is_featured === true,
    featured_order:
      typeof row.featured_order === 'number' && Number.isFinite(row.featured_order)
        ? row.featured_order
        : null,
  }
}

function sortCollections(a: CollectionSummary, b: CollectionSummary, sort: CollectionsSort): number {
  if (sort === 'title') {
    return a.title.localeCompare(b.title)
  }

  if (sort === 'featured') {
    const aFeatured = typeof a.featured_order === 'number' ? a.featured_order : Number.MAX_SAFE_INTEGER
    const bFeatured = typeof b.featured_order === 'number' ? b.featured_order : Number.MAX_SAFE_INTEGER
    if (aFeatured !== bFeatured) return aFeatured - bFeatured
  }

  return (
    b.aggregate_entry_count - a.aggregate_entry_count || a.title.localeCompare(b.title)
  )
}

function buildHierarchy(rows: CollectionListRow[]): {
  roots: CollectionSummary[]
  childrenByParent: Map<string, CollectionSummary[]>
} {
  const summaries = new Map<string, CollectionSummary>()
  for (const row of rows) {
    summaries.set(row.id as string, mapRowToSummary(row))
  }

  const childrenByParent = new Map<string, CollectionSummary[]>()
  for (const row of rows) {
    const parentId = row.parent_id as string | null | undefined
    if (!parentId) continue
    const child = summaries.get(row.id as string)
    if (!child) continue
    const list = childrenByParent.get(parentId) ?? []
    list.push(child)
    childrenByParent.set(parentId, list)
  }

  for (const [parentId, children] of childrenByParent) {
    children.sort((a, b) => sortCollections(a, b, 'featured'))
    const parent = summaries.get(parentId)
    if (!parent) continue
    parent.child_count = children.length
    const childNuggets = children.reduce((sum, c) => sum + c.direct_entry_count, 0)
    parent.aggregate_entry_count = parent.direct_entry_count + childNuggets
    parent.entry_count = parent.aggregate_entry_count
  }

  const roots = [...summaries.values()]
    .filter((s) => s.parent_id === null)
    .sort((a, b) => sortCollections(a, b, 'count'))

  return { roots, childrenByParent }
}

function buildHierarchyRoots(rows: CollectionListRow[]): CollectionSummary[] {
  return buildHierarchy(rows).roots
}

function toQueryText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function collectionMatchesQuery(collection: CollectionSummary, query: string): boolean {
  if (!query) return true
  return (
    collection.title.toLowerCase().includes(query) ||
    (collection.description ?? '').toLowerCase().includes(query) ||
    collection.curator_name.toLowerCase().includes(query)
  )
}

function browseCollections(
  rows: CollectionListRow[],
  options: CollectionsBrowseOptions
): CollectionsBrowseResult {
  const { roots, childrenByParent } = buildHierarchy(rows)
  const query = toQueryText(options.q)
  const sort = options.sort ?? 'featured'
  const selectedTopics = new Set((options.topic_ids ?? []).filter(Boolean))

  const groups: CollectionTopicGroup[] = roots
    .filter((root) => selectedTopics.size === 0 || selectedTopics.has(root.id))
    .map((parent) => {
      const children = [...(childrenByParent.get(parent.id) ?? [])]
      const matchesParent = collectionMatchesQuery(parent, query)
      const visibleChildren = query
        ? children.filter((child) => collectionMatchesQuery(child, query))
        : children

      if (query && !matchesParent && visibleChildren.length === 0) {
        return null
      }

      return {
        parent,
        children: visibleChildren.sort((a, b) => sortCollections(a, b, sort)),
      }
    })
    .filter((group): group is CollectionTopicGroup => group !== null)
    .sort((a, b) => sortCollections(a.parent, b.parent, sort))

  return {
    groups,
    total_parents: roots.length,
    total_children: roots.reduce((sum, root) => sum + root.child_count, 0),
    total_nuggets: roots.reduce((sum, root) => sum + root.aggregate_entry_count, 0),
  }
}

async function fetchPublishedCollectionListRows(): Promise<{
  rows: CollectionListRow[]
  hasHierarchy: boolean
}> {
  const supabase = getPublicClient()

  async function runQuery(includeCoverColumn: boolean, includeHierarchy: boolean) {
    const coverField = includeCoverColumn ? 'cover_image_url,' : ''
    const hierarchyFields = includeHierarchy
      ? 'parent_id, is_featured, featured_order,'
      : ''
    const selectClause = `
      id,
      title,
      description,
      curator_name,
      ${coverField}
      ${hierarchyFields}
      created_at,
      community_collection_entries ( position, articles ( hero_thumb_url ) )
    `

    return supabase
      .from('community_collections')
      .select(selectClause)
      .eq('status', 'published')
  }

  let includeCover = true
  let includeHierarchy = true
  let { data, error } = await runQuery(true, true)

  if (error && isMissingCoverImageUrlColumnError(error.message)) {
    includeCover = false
    ;({ data, error } = await runQuery(false, includeHierarchy))
  }
  if (error && isMissingParentIdColumnError(error.message)) {
    includeHierarchy = false
    ;({ data, error } = await runQuery(includeCover, false))
  }

  if (error) {
    throw new Error(`listCollections error: ${error.message}`)
  }

  const rows = (data ?? []) as unknown as CollectionListRow[]
  return { rows, hasHierarchy: includeHierarchy }
}

async function listCollectionsUncached(): Promise<CollectionSummary[]> {
  const { rows, hasHierarchy } = await fetchPublishedCollectionListRows()
  if (hasHierarchy) {
    return buildHierarchyRoots(rows)
  }
  return rows
    .map((row) => mapRowToSummary(row))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

async function listCollectionTopicsUncached(
  options: CollectionsBrowseOptions = {}
): Promise<CollectionsBrowseResult> {
  const { rows, hasHierarchy } = await fetchPublishedCollectionListRows()
  if (!hasHierarchy) {
    const roots = rows
      .map((row) => mapRowToSummary(row))
      .sort((a, b) => sortCollections(a, b, options.sort ?? 'count'))
      .filter((summary) => summary.parent_id === null)
    return {
      groups: roots.map((root) => ({ parent: root, children: [] })),
      total_parents: roots.length,
      total_children: 0,
      total_nuggets: roots.reduce((sum, root) => sum + root.entry_count, 0),
    }
  }

  return browseCollections(rows, options)
}

export async function listChildCollections(parentId: string): Promise<CollectionSummary[]> {
  const supabase = getPublicClient()

  async function runQuery(includeCoverColumn: boolean) {
    const coverField = includeCoverColumn ? 'cover_image_url,' : ''
    return supabase
      .from('community_collections')
      .select(`
        id,
        title,
        description,
        curator_name,
        ${coverField}
        parent_id,
        is_featured,
        featured_order,
        created_at,
        community_collection_entries ( position, articles ( hero_thumb_url ) )
      `)
      .eq('status', 'published')
      .eq('parent_id', parentId)
      .order('title', { ascending: true })
  }

  let { data, error } = await runQuery(true)
  if (error && isMissingCoverImageUrlColumnError(error.message)) {
    ;({ data, error } = await runQuery(false))
  }
  if (error && isMissingParentIdColumnError(error.message)) {
    return []
  }
  if (error) {
    throw new Error(`listChildCollections error: ${error.message}`)
  }

  return ((data ?? []) as unknown as CollectionListRow[]).map((row) => mapRowToSummary(row))
}

const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COLLECTIONS_PAGE_SIZE = 24

function encodeCollectionCursor(cursor: CollectionArticlesCursor): string {
  return `${cursor.publishedAt}|${cursor.articleId}`
}

function decodeCollectionCursor(token: string): CollectionArticlesCursor | null {
  const [publishedAtRaw, articleIdRaw] = token.trim().split('|')
  if (!publishedAtRaw || !articleIdRaw) return null
  if (!Number.isFinite(Date.parse(publishedAtRaw))) return null
  if (!UUID_RE.test(articleIdRaw)) return null

  return { publishedAt: publishedAtRaw, articleId: articleIdRaw }
}

async function runCollectionEntryArticleSelectChain(
  runQuery: (articleFields: string) => Promise<{ data: unknown; error: { message: string } | null }>
): Promise<{ data: unknown; error: { message: string } | null }> {
  let result = await runQuery(ARTICLE_FIELDS)
  if (result.error && isMissingCuratorDisplayNameColumnError(result.error.message)) {
    result = await runQuery(ARTICLE_FIELDS_NO_CURATOR)
  }
  if (result.error && isMissingCardPreviewError(result.error.message)) {
    result = await runQuery(LEGACY_ARTICLE_FIELDS)
    if (result.error && isMissingCuratorDisplayNameColumnError(result.error.message)) {
      result = await runQuery(LEGACY_ARTICLE_FIELDS_NO_CURATOR)
    }
  }
  return result
}

export async function listCollectionArticlesWindow(
  collectionId: string,
  cursorToken?: string | null,
  limit = COLLECTIONS_PAGE_SIZE
): Promise<CollectionArticlesWindow> {
  const supabase = getPublicClient()
  const pageLimit = Number.isInteger(limit) && limit > 0 ? limit : COLLECTIONS_PAGE_SIZE
  const decodedCursor =
    typeof cursorToken === 'string' && cursorToken.trim().length > 0
      ? decodeCollectionCursor(cursorToken)
      : null

  async function runVisibleQuery(articleFields: string) {
    let query = supabase
      .from('articles')
      .select(`
        ${articleFields},
        community_collection_entries!inner(collection_id)
      `)
      .eq('status', 'published')
      .eq('community_collection_entries.collection_id', collectionId)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageLimit)

    if (decodedCursor) {
      query = query.or(
        `published_at.lt.${decodedCursor.publishedAt},` +
        `and(published_at.eq.${decodedCursor.publishedAt},id.lt.${decodedCursor.articleId})`
      )
    }

    return query
  }

  const { data, error } = await runCollectionEntryArticleSelectChain(runVisibleQuery)
  if (error) {
    throw new Error(`listCollectionArticlesWindow error: ${error.message}`)
  }

  const normalized = normalizeCuratorDisplayNameOnRows((data ?? []) as Record<string, unknown>[])
  const rowsWithoutLabels: ArticleRowBase[] = normalized.map((flat) => ({
    ...flat,
    images: [],
    image_count: 0,
    hero_media_kind: normalizeHeroMediaKind(flat.hero_media_kind),
  })) as unknown as ArticleRowBase[]

  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithoutLabels as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  const articles = await attachCardPreviewHtml(rows)

  if (articles.length === 0) {
    return { articles, next_cursor: null }
  }

  const lastVisible = articles[articles.length - 1]
  const { data: nextRows, error: nextError } = await supabase
    .from('articles')
    .select(`
      id,
      published_at,
      community_collection_entries!inner(collection_id)
    `)
    .eq('status', 'published')
    .eq('community_collection_entries.collection_id', collectionId)
    .or(
      `published_at.lt.${lastVisible.published_at},` +
      `and(published_at.eq.${lastVisible.published_at},id.lt.${lastVisible.id})`
    )
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)

  if (nextError) {
    throw new Error(`listCollectionArticlesWindow next-cursor error: ${nextError.message}`)
  }

  const nextBatch = (nextRows ?? []) as Array<{ id: string }>
  if (nextBatch.length === 0) {
    return { articles, next_cursor: null }
  }

  return {
    articles,
    next_cursor: encodeCollectionCursor({
      publishedAt: lastVisible.published_at,
      articleId: lastVisible.id,
    }),
  }
}

export function isCollectionPublicId(id: string): boolean {
  return UUID_RE.test(id)
}

export async function resolveCollectionPublicId(idOrLegacy: string): Promise<string | null> {
  if (isCollectionPublicId(idOrLegacy)) return idOrLegacy
  if (!MONGO_OBJECT_ID_RE.test(idOrLegacy)) return null

  const supabase = getPublicClient()
  const { data, error } = await supabase
    .from('community_collections')
    .select('id')
    .eq('legacy_mongo_id', idOrLegacy)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) return null
  const row = data as { id: string }
  return row.id
}

const cachedCollectionsList = unstable_cache(
  listCollectionsUncached,
  ['collections-list'],
  {
    tags: [CACHE_TAGS.collectionsList],
    revalidate: 300,
  }
)

export async function listCollections(): Promise<CollectionSummary[]> {
  try {
    return await cachedCollectionsList()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`listCollections cached path failed: ${message}`)
    try {
      return await listCollectionsUncached()
    } catch (uncachedError) {
      const uncachedMessage =
        uncachedError instanceof Error ? uncachedError.message : String(uncachedError)
      console.error(`listCollections uncached fallback failed: ${uncachedMessage}`)
      return []
    }
  }
}

export async function listCollectionTopics(
  options: CollectionsBrowseOptions = {}
): Promise<CollectionsBrowseResult> {
  try {
    return await listCollectionTopicsUncached(options)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`listCollectionTopics failed: ${message}`)
    return {
      groups: [],
      total_parents: 0,
      total_children: 0,
      total_nuggets: 0,
    }
  }
}

// ─── Detail ───────────────────────────────────────────────────────────

const ARTICLE_FIELDS = `
  id,
  slug,
  title,
  card_preview,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url,
  curator_display_name
`.trim()

const LEGACY_ARTICLE_FIELDS = `
  id,
  slug,
  title,
  card_preview:excerpt,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url,
  curator_display_name
`.trim()

const ARTICLE_FIELDS_NO_CURATOR = `
  id,
  slug,
  title,
  card_preview,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url
`.trim()

const LEGACY_ARTICLE_FIELDS_NO_CURATOR = `
  id,
  slug,
  title,
  card_preview:excerpt,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url
`.trim()

function isMissingCardPreviewError(message: string): boolean {
  return /card_preview/i.test(message)
}

function isMissingCuratorDisplayNameColumnError(message: string): boolean {
  return /curator_display_name/i.test(message) && /does not exist/i.test(message)
}

function isMissingCoverImageUrlColumnError(message: string): boolean {
  return /cover_image_url/i.test(message) && /does not exist/i.test(message)
}

async function getCollectionByIdUncached(id: string): Promise<CollectionDetail | null> {
  const supabase = getPublicClient()

  async function runQuery(
    articleFields: string,
    includeCoverColumn = true,
    includeHierarchy = true
  ) {
    const coverFragment = includeCoverColumn ? 'cover_image_url,' : ''
    const hierarchyFragment = includeHierarchy ? 'parent_id,' : ''
    return supabase
      .from('community_collections')
      .select(`
        id,
        title,
        description,
        curator_name,
        ${coverFragment}
        ${hierarchyFragment}
        created_at,
        community_collection_entries (
          position,
          articles ( ${articleFields} )
        )
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single()
  }

  let includeHierarchy = true
  let { data, error } = await runQuery(ARTICLE_FIELDS, true, includeHierarchy)
  if (error && isMissingParentIdColumnError(error.message)) {
    includeHierarchy = false
    ;({ data, error } = await runQuery(ARTICLE_FIELDS, true, false))
  }
  if (error && isMissingCuratorDisplayNameColumnError(error.message)) {
    ;({ data, error } = await runQuery(ARTICLE_FIELDS_NO_CURATOR, true, includeHierarchy))
  }
  if (error && isMissingCoverImageUrlColumnError(error.message)) {
    ;({ data, error } = await runQuery(ARTICLE_FIELDS, false, includeHierarchy))
    if (error && isMissingCuratorDisplayNameColumnError(error.message)) {
      ;({ data, error } = await runQuery(ARTICLE_FIELDS_NO_CURATOR, false, includeHierarchy))
    }
  }
  if (error && isMissingCardPreviewError(error.message)) {
    ;({ data, error } = await runQuery(LEGACY_ARTICLE_FIELDS, true, includeHierarchy))
    if (error && isMissingCuratorDisplayNameColumnError(error.message)) {
      ;({ data, error } = await runQuery(LEGACY_ARTICLE_FIELDS_NO_CURATOR, true, includeHierarchy))
    }
    if (error && isMissingCoverImageUrlColumnError(error.message)) {
      ;({ data, error } = await runQuery(LEGACY_ARTICLE_FIELDS, false, includeHierarchy))
      if (error && isMissingCuratorDisplayNameColumnError(error.message)) {
        ;({ data, error } = await runQuery(LEGACY_ARTICLE_FIELDS_NO_CURATOR, false, includeHierarchy))
      }
    }
  }

  if (error) {
    throw new Error(`getCollectionById error: ${error.message}`)
  }
  if (!data) return null

  const raw = data as unknown as CollectionDetailRow
  const entries: Array<{ position: number; articles: ArticleRowWithoutImages | null }> =
    raw.community_collection_entries ?? []

  const rawArticles: Record<string, unknown>[] = entries
    .filter((e) => e.articles != null)
    .sort((a, b) => a.position - b.position)
    .map((e) => e.articles as unknown as Record<string, unknown>)

  const normalized = normalizeCuratorDisplayNameOnRows(rawArticles)

  const rowsWithoutLabels: ArticleRowBase[] = normalized.map((flat) => ({
    ...flat,
    images: [],
    image_count: 0,
    hero_media_kind: normalizeHeroMediaKind(flat.hero_media_kind),
  })) as unknown as ArticleRowBase[]

  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithoutLabels as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  const articles = await attachCardPreviewHtml(rows)

  const coverEntries = entries.map((e) => ({
    position: e.position,
    articles: e.articles
      ? { hero_thumb_url: e.articles.hero_thumb_url as string | null }
      : null,
  }))

  const directEntryCount = entries.filter((e) => e.articles != null).length
  let parent: CollectionDetail['parent'] = null
  let children: CollectionSummary[] = []

  if (includeHierarchy && raw.parent_id) {
    const { data: parentRow } = await supabase
      .from('community_collections')
      .select('id, title')
      .eq('id', raw.parent_id as string)
      .eq('status', 'published')
      .maybeSingle()
    const parentRef = parentRow as { id: string; title: string } | null
    if (parentRef) {
      parent = {
        id: parentRef.id,
        title: parentRef.title,
      }
    }
  }

  if (includeHierarchy && !raw.parent_id) {
    children = await listChildCollections(raw.id as string)
  }

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: raw.description as string | null,
    curator_name: raw.curator_name as string,
    cover_url: deriveCover(raw.cover_image_url as string | null, coverEntries),
    created_at: raw.created_at as string,
    articles,
    parent,
    children,
    direct_entry_count: directEntryCount,
    child_count: children.length,
  }
}

export async function getCollectionById(id: string): Promise<CollectionDetail> {
  let collection: CollectionDetail | null = null
  try {
    const runner = unstable_cache(
      async () => getCollectionByIdUncached(id),
      ['collection-detail', id],
      {
        tags: [CACHE_TAGS.collection(id)],
        revalidate: 300,
      }
    )
    collection = await runner()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`getCollectionById cached path failed (${id}): ${message}`)
    collection = await getCollectionByIdUncached(id)
  }

  if (!collection) notFound()
  return collection
}

async function getCollectionDetailShellUncached(id: string): Promise<CollectionDetailShell | null> {
  const supabase = getPublicClient()

  async function runQuery(includeCoverColumn = true, includeHierarchy = true) {
    const coverFragment = includeCoverColumn ? 'cover_image_url,' : ''
    const hierarchyFragment = includeHierarchy ? 'parent_id,' : ''
    return supabase
      .from('community_collections')
      .select(`
        id,
        title,
        description,
        curator_name,
        ${coverFragment}
        ${hierarchyFragment}
        created_at
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single()
  }

  let includeHierarchy = true
  let { data, error } = await runQuery(true, includeHierarchy)
  if (error && isMissingParentIdColumnError(error.message)) {
    includeHierarchy = false
    ;({ data, error } = await runQuery(true, false))
  }
  if (error && isMissingCoverImageUrlColumnError(error.message)) {
    ;({ data, error } = await runQuery(false, includeHierarchy))
  }

  if (error) {
    throw new Error(`getCollectionDetailShell error: ${error.message}`)
  }
  if (!data) return null

  const raw = data as unknown as CollectionDetailRow

  const { count: directEntryCountRaw, error: countError } = await supabase
    .from('community_collection_entries')
    .select('article_id', { count: 'exact', head: true })
    .eq('collection_id', id)
  if (countError) {
    throw new Error(`getCollectionDetailShell count error: ${countError.message}`)
  }
  const directEntryCount = directEntryCountRaw ?? 0

  let fallbackCoverUrl: string | null = null
  if (!raw.cover_image_url) {
    const { data: coverRows, error: coverError } = await supabase
      .from('community_collection_entries')
      .select('position, articles ( hero_thumb_url )')
      .eq('collection_id', id)
      .order('position', { ascending: true })
      .limit(1)
    if (coverError) {
      throw new Error(`getCollectionDetailShell cover fallback error: ${coverError.message}`)
    }
    const firstCover = (coverRows?.[0] as { articles?: { hero_thumb_url?: string | null } | null } | undefined)
      ?.articles?.hero_thumb_url
    fallbackCoverUrl = firstCover ?? null
  }

  let parent: CollectionDetail['parent'] = null
  let children: CollectionSummary[] = []

  if (includeHierarchy && raw.parent_id) {
    const { data: parentRow } = await supabase
      .from('community_collections')
      .select('id, title')
      .eq('id', raw.parent_id as string)
      .eq('status', 'published')
      .maybeSingle()
    const parentRef = parentRow as { id: string; title: string } | null
    if (parentRef) {
      parent = {
        id: parentRef.id,
        title: parentRef.title,
      }
    }
  }

  if (includeHierarchy && !raw.parent_id) {
    children = await listChildCollections(raw.id as string)
  }

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: raw.description as string | null,
    curator_name: raw.curator_name as string,
    cover_url: (raw.cover_image_url as string | null) ?? fallbackCoverUrl,
    created_at: raw.created_at as string,
    parent,
    children,
    direct_entry_count: directEntryCount,
    child_count: children.length,
  }
}

export async function getCollectionDetailShell(id: string): Promise<CollectionDetailShell> {
  let collection: CollectionDetailShell | null = null
  try {
    const runner = unstable_cache(
      async () => getCollectionDetailShellUncached(id),
      ['collection-detail-shell', id],
      {
        tags: [CACHE_TAGS.collection(id)],
        revalidate: 300,
      }
    )
    collection = await runner()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`getCollectionDetailShell cached path failed (${id}): ${message}`)
    collection = await getCollectionDetailShellUncached(id)
  }

  if (!collection) notFound()
  return collection
}

// Lightweight meta for generateMetadata — avoids loading full entries.
async function getCollectionMetaUncached(
  id: string
): Promise<{ title: string; description: string | null } | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('community_collections')
    .select('title, description')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return null
  const row = data as unknown as { title: string; description: string | null }
  return { title: row.title, description: row.description }
}

export async function getCollectionMeta(
  id: string
): Promise<{ title: string; description: string | null } | null> {
  try {
    const runner = unstable_cache(
      async () => getCollectionMetaUncached(id),
      ['collection-meta', id],
      {
        tags: [CACHE_TAGS.collection(id)],
        revalidate: 300,
      }
    )
    return runner()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`getCollectionMeta cached path failed (${id}): ${message}`)
    return getCollectionMetaUncached(id)
  }
}
