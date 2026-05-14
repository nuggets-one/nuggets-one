'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  markdown: string
}

const previewProse = `prose prose-sm max-w-none dark:prose-invert
  prose-headings:text-primary prose-p:text-muted prose-a:text-accent`

export function LegalMarkdownPreview({ markdown }: Props) {
  return (
    <div className={`max-h-[min(70vh,720px)] overflow-y-auto rounded-xl border border-border bg-surface-raised p-4 ${previewProse}`}>
      {markdown.trim().length === 0 ? (
        <p className="text-sm text-muted">Nothing to preview yet.</p>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      )}
    </div>
  )
}
