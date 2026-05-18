const EXCERPT_MAX_LEN = 240
const CARD_PREVIEW_MAX_LEN = 420
const MAX_CARD_PREVIEW_BLOCKS = 3

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeInlineSpacing(value: string): string {
  return value
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
}

function truncateAtWordBoundary(value: string, max: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed

  const cut = trimmed.slice(0, max - 1).replace(/\s+\S*$/, '')
  const truncated = (cut || trimmed.slice(0, max - 1)).trimEnd()
  return `${truncated}…`
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function normalizeInlineMarkup(value: string): string {
  const normalized = decodeHtmlEntities(value)
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<https?:\/\/[^>]+>/gi, (match) => {
      const url = match.slice(1, -1).trim()
      return url ? `[${url}](${url})` : ' '
    })
    .replace(
      /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
      (_, __: string, href: string, label: string) => {
        const normalizedHref = collapseWhitespace(decodeHtmlEntities(href))
        const normalizedLabel = normalizeInlineMarkup(label)
        if (!normalizedLabel) return ''
        return normalizedHref ? `[${normalizedLabel}](${normalizedHref})` : normalizedLabel
      }
    )
    .replace(/<(strong|b)\b[^>]*>/gi, '**')
    .replace(/<\/(strong|b)>/gi, '**')
    .replace(/<(em|i)\b[^>]*>/gi, '*')
    .replace(/<\/(em|i)>/gi, '*')
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, code: string) => {
      const text = collapseWhitespace(decodeHtmlEntities(code).replace(/<\/?[^>]+>/g, ' '))
      return text ? `\`${text.replace(/`+/g, '')}\`` : ''
    })
    .replace(/<button\b[^>]*>([\s\S]*?)<\/button>/gi, (_, label: string) => normalizeInlineMarkup(label))
    .replace(/<\/?[^>]+>/g, ' ')

  return normalizeInlineSpacing(collapseWhitespace(normalized))
}

function normalizeLegacyHtmlBlocks(value: string): string {
  return value
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) => {
      const quoteText = normalizeInlineMarkup(
        inner
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<p\b[^>]*>/gi, '')
      )

      return quoteText ? `\n\n> ${quoteText}\n\n` : '\n\n'
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h[1-6])>/gi, '\n\n')
    .replace(/<(p|div|section|article|h[1-6])\b[^>]*>/gi, '')
}

function normalizeQuoteBlock(lines: string[]): string {
  const text = normalizeInlineMarkup(lines.map((line) => line.replace(/^>\s?/, ' ')).join(' '))

  return text ? `> ${text}` : ''
}

const LIST_LINE_RE = /^([-*+]|\d+\.)\s+/
const HEADING_LINE_RE = /^#{1,6}\s+/

function isListLine(line: string): boolean {
  return LIST_LINE_RE.test(line)
}

function isHeadingLine(line: string): boolean {
  return HEADING_LINE_RE.test(line)
}

function boldifyHeadingText(text: string): string {
  const normalized = normalizeInlineMarkup(text)
  if (!normalized) return ''
  if (/^\*\*[^*][\s\S]*\*\*$/.test(normalized)) return normalized
  return `**${normalized}**`
}

function normalizeParagraphLine(line: string): string {
  if (isHeadingLine(line)) {
    return boldifyHeadingText(line.replace(HEADING_LINE_RE, ''))
  }
  return normalizeInlineMarkup(line)
}

function normalizeListBlock(lines: string[]): string {
  const items = lines
    .map((line) => normalizeInlineMarkup(line.replace(LIST_LINE_RE, ' ')))
    .filter(Boolean)

  return items.map((item) => `- ${item}`).join('\n')
}

function normalizeParagraphBlock(lines: string[]): string {
  return lines.map(normalizeParagraphLine).filter(Boolean).join(' ')
}

function normalizeMixedBlock(lines: string[]): string {
  const parts: string[] = []
  let run: string[] = []
  let runKind: 'paragraph' | 'list' | null = null

  function flush() {
    if (run.length === 0 || !runKind) return
    const normalized =
      runKind === 'list' ? normalizeListBlock(run) : normalizeParagraphBlock(run)
    if (normalized) parts.push(normalized)
    run = []
    runKind = null
  }

  for (const line of lines) {
    const kind = isListLine(line) ? 'list' : 'paragraph'
    if (runKind && runKind !== kind) flush()
    runKind = kind
    run.push(line)
  }
  flush()

  return parts.join('\n\n')
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
  if (lines.every(isHeadingLine)) return normalizeParagraphBlock(lines)
  if (lines.every((line) => /^>\s?/.test(line))) return normalizeQuoteBlock(lines)
  if (lines.every(isListLine)) return normalizeListBlock(lines)
  if (lines.some(isListLine)) return normalizeMixedBlock(lines)
  return normalizeParagraphBlock(lines)
}

export function buildExcerptFromMarkdown(markdown: string): string {
  const plain = collapseWhitespace(markdown.replace(/[#*_`>\-\[\]\(\)!]/g, ' '))
  if (plain.length <= EXCERPT_MAX_LEN) return plain
  return `${plain.slice(0, EXCERPT_MAX_LEN - 1).trimEnd()}…`
}

export function buildCardPreviewFromMarkdown(markdown: string): string {
  const blocks = normalizeLegacyHtmlBlocks(markdown)
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
