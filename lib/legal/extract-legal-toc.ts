import {
  extractMarkdownToc,
  type MarkdownTocItem,
} from '@/lib/markdown/extract-markdown-toc'

export type LegalTocItem = MarkdownTocItem

export function extractLegalTocFromMarkdown(markdown: string): LegalTocItem[] {
  return extractMarkdownToc(markdown).items
}
