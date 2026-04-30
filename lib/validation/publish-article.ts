import { z } from 'zod'

const CONTENT_STREAM_VALUES = ['standard', 'pulse'] as const
const EXCERPT_MAX_LEN = 240

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

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function buildExcerptFromMarkdown(markdown: string): string {
  const plain = collapseWhitespace(markdown.replace(/[#*_`>\-\[\]\(\)!]/g, ' '))
  if (plain.length <= EXCERPT_MAX_LEN) return plain
  return `${plain.slice(0, EXCERPT_MAX_LEN - 1).trimEnd()}…`
}

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

  return {
    ...parsed,
    excerpt: cleanedExcerpt || buildExcerptFromMarkdown(parsed.content_markdown),
  }
}

