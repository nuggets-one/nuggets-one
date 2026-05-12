const EXCERPT_MAX_LEN = 240
const CARD_PREVIEW_MAX_LEN = 420
const MAX_CARD_PREVIEW_BLOCKS = 3

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateAtWordBoundary(value: string, max: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed

  const cut = trimmed.slice(0, max - 1).replace(/\s+\S*$/, '')
  const truncated = (cut || trimmed.slice(0, max - 1)).trimEnd()
  return `${truncated}…`
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/<https?:\/\/[^>]+>/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[*_~`]+/g, '')
}

function normalizeQuoteBlock(lines: string[]): string {
  const text = collapseWhitespace(
    lines
      .map((line) => stripInlineMarkdown(line.replace(/^>\s?/, ' ')))
      .join(' ')
  )

  return text ? `> ${text}` : ''
}

function normalizeListBlock(lines: string[]): string {
  const items = lines
    .map((line) => collapseWhitespace(stripInlineMarkdown(line.replace(/^([-*+]|\d+\.)\s+/, ' '))))
    .filter(Boolean)

  return items.map((item) => `- ${item}`).join('\n')
}

function normalizeParagraphBlock(lines: string[]): string {
  const text = collapseWhitespace(
    stripInlineMarkdown(
      lines
        .map((line) => line.replace(/^#{1,6}\s+/, ''))
        .join(' ')
    )
  )

  return text
}

function normalizeMarkdownBlock(block: string): string {
  const cleaned = block.replace(/\r/g, '').trim()
  if (!cleaned) return ''
  if (/^(```|~~~)/.test(cleaned)) return ''
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(cleaned)) return ''

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''
  if (lines.every((line) => /^#{1,6}\s+/.test(line))) return ''
  if (lines.every((line) => /^>\s?/.test(line))) return normalizeQuoteBlock(lines)
  if (lines.every((line) => /^([-*+]|\d+\.)\s+/.test(line))) return normalizeListBlock(lines)
  return normalizeParagraphBlock(lines)
}

export function buildExcerptFromMarkdown(markdown: string): string {
  const plain = collapseWhitespace(markdown.replace(/[#*_`>\-\[\]\(\)!]/g, ' '))
  if (plain.length <= EXCERPT_MAX_LEN) return plain
  return `${plain.slice(0, EXCERPT_MAX_LEN - 1).trimEnd()}…`
}

export function buildCardPreviewFromMarkdown(markdown: string): string {
  const blocks = markdown
    .split(/\n\s*\n/g)
    .map(normalizeMarkdownBlock)
    .filter(Boolean)
    .slice(0, MAX_CARD_PREVIEW_BLOCKS)

  if (blocks.length === 0) return ''
  return truncateAtWordBoundary(blocks.join('\n\n'), CARD_PREVIEW_MAX_LEN)
}

export function resolveCardPreview(input: {
  content_markdown: string | null | undefined
  excerpt: string | null | undefined
}): string | null {
  const fromBody = buildCardPreviewFromMarkdown(input.content_markdown ?? '')
  if (fromBody) return fromBody

  const fromExcerpt = buildCardPreviewFromMarkdown(input.excerpt ?? '')
  return fromExcerpt || null
}
