import type { ArticleCardProps } from './article'

export type CollectionSummary = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_url: string | null    // derived: cover_image_url ?? first entry hero ?? null
  created_at: string
  /** Shown on cards — aggregate for roots, direct count for sub-collections */
  entry_count: number
  direct_entry_count: number
  aggregate_entry_count: number
  child_count: number
  parent_id: string | null
  is_featured: boolean
  featured_order: number | null
}

export type CollectionsSort = 'featured' | 'count' | 'title'

export type CollectionTopicGroup = {
  parent: CollectionSummary
  children: CollectionSummary[]
}

export type CollectionsBrowseOptions = {
  q?: string
  topic_ids?: string[]
  sort?: CollectionsSort
}

export type CollectionsBrowseResult = {
  groups: CollectionTopicGroup[]
  total_parents: number
  total_children: number
  total_nuggets: number
}

export type CollectionParentRef = {
  id: string
  title: string
}

export type CollectionDetail = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_url: string | null
  created_at: string
  articles: ArticleCardProps[]
  parent: CollectionParentRef | null
  children: CollectionSummary[]
  direct_entry_count: number
  child_count: number
}

export { type ArticleCardProps }
