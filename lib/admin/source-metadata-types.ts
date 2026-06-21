export type SourceMetadataProvider = 'youtube' | 'web' | 'image'

export type SourceMetadata = {
  provider: SourceMetadataProvider
  title: string | null
  description: string | null
  imageUrl: string | null
  author: string | null
  canonicalUrl: string
}

export type SourceMetadataErrorCode =
  | 'invalid_url'
  | 'blocked_host'
  | 'fetch_failed'
  | 'no_metadata'
