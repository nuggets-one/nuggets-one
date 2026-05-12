import { buildExcerptFromMarkdown, collapseWhitespace, resolveCardPreview } from '@shared/article-preview'
import { z } from 'zod'

const CONTENT_STREAM_VALUES = ['standard', 'pulse'] as const
export const publishArticleSchema = z.object({
  title: z.string().trim().min(1, 'title_required').max(300, 'title_too_long'),
  content_markdown: z.string().trim().min(1, 'body_required'),
  content_stream: z.enum(CONTENT_STREAM_VALUES, { message: 'stream_required' }),
  source_url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => value || null)
    .refine((value) => !value || /^https?:\/\//i.test(value), 'source_url_invalid')
    .refine((value) => !value || z.string().url().safeParse(value).success, 'source_url_invalid'),
  excerpt: z.string().optional().nullable(),
})

export function normalizePublishPayload(input: {
  title: string
  content_markdown: string | null
  content_stream: string | null
  source_url: string | null
  excerpt: string | null
}) {
  const parsed = publishArticleSchema.parse({
    title: input.title,
    content_markdown: input.content_markdown ?? '',
    content_stream: input.content_stream ?? '',
    source_url: input.source_url,
    excerpt: input.excerpt,
  })

  const cleanedExcerpt = collapseWhitespace(parsed.excerpt ?? '')
  const resolvedExcerpt = cleanedExcerpt || buildExcerptFromMarkdown(parsed.content_markdown)

  return {
    ...parsed,
    excerpt: resolvedExcerpt,
    card_preview: resolveCardPreview({
      content_markdown: parsed.content_markdown,
      excerpt: resolvedExcerpt,
    }),
  }
}

