import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  markdown: string
}

export function ArticleBody({ markdown }: Props) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none
      prose-headings:font-semibold prose-headings:tracking-tight
      prose-a:text-primary prose-a:underline prose-a:underline-offset-2
      prose-img:rounded-lg prose-img:my-6
      prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted
      prose-code:bg-surface-raised prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm
      prose-pre:bg-surface-raised prose-pre:rounded-xl prose-pre:border prose-pre:border-border">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
