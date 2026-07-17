import { createElement } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeParenTimestampsInMarkdown } from '@/lib/markdown/normalize-youtube-timestamps'
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
  /**
   * Ids for headings in **document order** (every `#`–`######`), aligned to
   * `extractMarkdownToc().headingIdByPosition`.
   */
  headingIdByPosition?: (string | undefined)[]
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
        <Image
          src={src}
          alt={alt ?? ''}
          width={720}
          height={0}
          sizes="(max-width: 768px) 100vw, 720px"
          quality={75}
          loading="lazy"
          className="h-auto w-full rounded-lg"
        />
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
        className="h-auto w-full rounded-lg"
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
  const { className, href, ...rest } = props
  const isYtTimestamp = typeof href === 'string' && /#yt=/.test(href)
  const ytClasses = isYtTimestamp
    ? 'cursor-pointer rounded-sm transition-colors active:bg-accent-soft'
    : ''
  return (
    <a
      {...rest}
      href={href}
      data-yt-link={isYtTimestamp ? '' : undefined}
      className={`rounded-sm border-none bg-transparent p-0 font-inherit text-body-link no-underline transition-colors hover:underline ${ytClasses} ${className ?? ''}`.trim()}
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

function buildHeadingComponents(headingIdByPosition: (string | undefined)[] | undefined) {
  const pos = { current: 0 }
  const ids = headingIdByPosition

  const mk = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const Heading = ({ children, ...rest }: HTMLAttributes<HTMLHeadingElement>) => {
      const idx = pos.current
      pos.current += 1
      const id = ids?.[idx]
      const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      return createElement(tag, { ...rest, id: id ?? undefined }, children)
    }
    Heading.displayName = `ArticleBodyH${level}`
    return Heading
  }

  return {
    h1: mk(1),
    h2: mk(2),
    h3: mk(3),
    h4: mk(4),
    h5: mk(5),
    h6: mk(6),
  }
}

export function ArticleBody({
  markdown,
  compact = false,
  headingIdByPosition,
}: Props) {
  const normalizedMarkdown = normalizeParenTimestampsInMarkdown(markdown)
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
    : `prose max-w-none text-[15px] leading-7 text-muted
      prose-headings:mb-3 prose-headings:mt-9 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-primary
      prose-h2:text-[1.34rem] prose-h2:leading-tight prose-h3:text-[1.14rem] prose-h3:leading-snug prose-h4:text-[0.98rem]
      prose-p:my-0 prose-p:mb-5 prose-p:text-[15px] prose-p:leading-7 prose-p:text-muted
      prose-li:text-[15px] prose-li:leading-7 prose-li:text-muted prose-li:marker:text-muted
      prose-ul:my-5 prose-ol:my-5
      prose-strong:font-semibold prose-strong:text-primary prose-em:text-muted
      prose-a:no-underline prose-a:underline-offset-2
      prose-hr:my-8 prose-hr:border-border
      prose-img:my-7 prose-img:rounded-xl
      prose-blockquote:my-7 prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-5 prose-blockquote:text-[15px] prose-blockquote:italic prose-blockquote:font-normal prose-blockquote:text-muted
      prose-code:rounded prose-code:bg-surface-raised prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:text-primary
      prose-pre:my-7 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-surface-raised prose-pre:p-4 prose-pre:text-sm prose-pre:text-primary
      [&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none
      [&_h1]:scroll-mt-28 [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28 [&_h4]:scroll-mt-28 [&_h5]:scroll-mt-28 [&_h6]:scroll-mt-28
      sm:text-[15.5px] sm:prose-p:text-[15.5px] sm:prose-li:text-[15.5px] sm:prose-blockquote:text-[15.5px]`

  const headingComponents = buildHeadingComponents(headingIdByPosition)

  return (
    <div className={proseClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ...headingComponents,
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
        {normalizedMarkdown}
      </ReactMarkdown>
    </div>
  )
}
