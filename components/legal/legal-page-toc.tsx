'use client'

import { MarkdownPageToc } from '@/components/ui/markdown-page-toc'
import type { LegalTocItem } from '@/lib/legal/extract-legal-toc'

type Props = {
  items: LegalTocItem[]
  articleId: string
}

export function LegalPageToc({ items, articleId }: Props) {
  return <MarkdownPageToc items={items} scrollRootId={articleId} />
}
