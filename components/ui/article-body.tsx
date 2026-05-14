import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react'

type Props = {
  markdown: string
  compact?: boolean
}

const CLOUDINARY_ORIGIN = 'https://res.cloudinary.com'

function BodyImage({
  src,
  alt,
}: {
  src?: string
  alt?: string
}) {
  if (!src) return null

  const isCloudinary = src.startsWith(CLOUDINARY_ORIGIN)

  if (isCloudinary) {
    return (
      <figure className="my-6 w-full max-w-prose">
        <div className="relative w-full aspect-video overflow-hidden rounded-lg">
          <Image
            src={src}
            alt={alt ?? ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
            quality={75}
            loading="lazy"
          />
        </div>
        {alt && (
          <figcaption className="mt-2 text-center text-xs text-muted">
            {alt}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="my-6 w-full max-w-prose">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        className="w-full rounded-lg"
      />
      {alt && (
        <figcaption className="mt-2 text-center text-xs text-muted">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}

function BodyLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { className, ...rest } = props
  return (
    <a
      {...rest}
      className={`rounded-sm bg-transparent border-none p-0 font-inherit text-body-link no-underline transition-colors hover:underline ${className ?? ''}`.trim()}
    />
  )
}

function BodyTable({
  compact,
  className,
  ...rest
}: TableHTMLAttributes<HTMLTableElement> & { compact: boolean }) {
  const tableClassName = compact ? 'my-3 w-full border-collapse text-xs' : 'my-4 w-full border-collapse text-sm'

  return (
    <div className="markdown-table-wrapper not-prose -mx-1 overflow-x-auto px-1">
      <table {...rest} className={`${tableClassName} ${className ?? ''}`.trim()} />
    </div>
  )
}

function BodyTableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  const { className, ...rest } = props
  return <thead {...rest} className={`bg-rail ${className ?? ''}`.trim()} />
}

function BodyTableHeaderCell({
  compact,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { compact: boolean }) {
  const headerClassName = compact
    ? 'whitespace-nowrap border-b border-border px-2.5 py-1.5 text-left text-xs font-bold text-primary'
    : 'whitespace-nowrap border-b border-border px-3 py-2 text-left text-sm font-bold text-primary'

  return <th {...rest} className={`${headerClassName} ${className ?? ''}`.trim()} />
}

function BodyTableCell({
  compact,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { compact: boolean }) {
  const cellClassName = compact
    ? 'align-top border-b border-border px-2.5 py-1.5 text-xs text-muted'
    : 'align-top border-b border-border px-3 py-2 text-sm text-muted'

  return <td {...rest} className={`${cellClassName} ${className ?? ''}`.trim()} />
}

export function ArticleBody({ markdown, compact = false }: Props) {
  const proseClassName = compact
    ? `prose max-w-none text-xs leading-relaxed text-muted
      prose-headings:mb-1 prose-headings:mt-1.5 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-primary prose-headings:leading-tight
      prose-h1:text-xs prose-h2:text-xs prose-h3:text-xs prose-h4:text-xs
      prose-p:my-0 prose-p:mb-1.5 prose-p:text-xs prose-p:leading-relaxed prose-p:text-muted
      prose-li:text-xs prose-li:leading-relaxed prose-li:text-muted prose-li:marker:text-muted
      prose-ul:my-2 prose-ol:my-2 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-4 prose-ol:pl-4
      prose-strong:font-bold prose-strong:text-primary prose-em:text-muted
      prose-a:no-underline prose-a:underline-offset-2
      prose-hr:my-6 prose-hr:border-border
      prose-img:my-5 prose-img:rounded-xl
      prose-blockquote:my-4 prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-xs prose-blockquote:italic prose-blockquote:font-normal prose-blockquote:text-muted
      prose-code:rounded prose-code:bg-surface-raised prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.82em] prose-code:text-primary
      prose-pre:my-5 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-surface-raised prose-pre:p-4 prose-pre:text-sm prose-pre:text-primary
      [&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none
      [&_blockquote_p]:mb-1.5 [&_li]:pl-0.5`
    : `prose max-w-none text-sm leading-7 text-muted
      prose-headings:mb-3 prose-headings:mt-8 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-primary
      prose-h2:text-xl prose-h3:text-lg
      prose-p:my-0 prose-p:mb-5 prose-p:text-sm prose-p:leading-7 prose-p:text-muted
      prose-li:text-sm prose-li:leading-7 prose-li:text-muted prose-li:marker:text-muted
      prose-ul:my-5 prose-ol:my-5
      prose-strong:font-semibold prose-strong:text-primary prose-em:text-muted
      prose-a:no-underline prose-a:underline-offset-2
      prose-hr:my-8 prose-hr:border-border
      prose-img:my-6 prose-img:rounded-xl
      prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-sm prose-blockquote:italic prose-blockquote:font-normal prose-blockquote:text-muted
      prose-code:rounded prose-code:bg-surface-raised prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:text-primary
      prose-pre:my-6 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-surface-raised prose-pre:p-4 prose-pre:text-sm prose-pre:text-primary
      [&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none
      sm:text-base sm:prose-p:text-base sm:prose-li:text-base sm:prose-blockquote:text-base`

  return (
    <div className={proseClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <BodyLink href={href} {...props}>
              {children}
            </BodyLink>
          ),
          img: ({ src, alt }) => (
            <BodyImage src={typeof src === 'string' ? src : undefined} alt={alt} />
          ),
          table: ({ children, ...props }) => (
            <BodyTable compact={compact} {...props}>
              {children}
            </BodyTable>
          ),
          thead: ({ ...props }) => <BodyTableHead {...props} />,
          th: ({ children, ...props }) => (
            <BodyTableHeaderCell compact={compact} {...props}>
              {children}
            </BodyTableHeaderCell>
          ),
          td: ({ children, ...props }) => (
            <BodyTableCell compact={compact} {...props}>
              {children}
            </BodyTableCell>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
