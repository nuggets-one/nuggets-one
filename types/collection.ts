import type { ArticleCardProps } from './article'

export type CollectionSummary = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_url: string | null    // derived: cover_image_url ?? first entry hero ?? null
  created_at: string
  entry_count: number
}

export type CollectionDetail = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_url: string | null
  created_at: string
  articles: ArticleCardProps[]
}

export { type ArticleCardProps }
