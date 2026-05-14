import Link from 'next/link'
import { createElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { slugify } from '@shared/slug'

type Props = {
  markdown: string
}

function textFromChildren(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map(textFromChildren).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    const el = children as { props?: { children?: ReactNode } }
    return textFromChildren(el.props?.children ?? '')
  }
  return ''
}

function LegalBodyLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, className } = props
  if (href?.startsWith('/')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  const external = href?.startsWith('http')
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

const proseClassName = `prose prose-slate dark:prose-invert max-w-none
  prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-primary
  prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-4
  prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-xl sm:prose-h2:text-2xl
  prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-lg
  prose-p:leading-relaxed prose-p:text-muted
  prose-li:my-1.5 prose-li:marker:text-muted prose-ul:my-5 prose-ol:my-5
  prose-blockquote:border-l-accent prose-blockquote:border-l-4 prose-blockquote:italic
  prose-strong:text-primary prose-hr:my-10 prose-hr:border-border
  prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline
  prose-code:text-primary prose-code:bg-surface-raised prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.9em]
  prose-pre:bg-surface-raised prose-pre:border prose-pre:border-border`

function headingRenderer(tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
  function LegalHeading(props: HTMLAttributes<HTMLHeadingElement>) {
    const { children, ...rest } = props
    const id = slugify(textFromChildren(children).trim()) || undefined
    return createElement(
      tag,
      {
        ...rest,
        id,
        style: { scrollMarginTop: '6rem' },
      },
      children
    )
  }
  LegalHeading.displayName = `LegalHeading(${tag})`
  return LegalHeading
}

export function LegalBody({ markdown }: Props) {
  return (
    <div className={proseClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <LegalBodyLink href={href} {...props}>
              {children}
            </LegalBodyLink>
          ),
          h1: headingRenderer('h1'),
          h2: headingRenderer('h2'),
          h3: headingRenderer('h3'),
          h4: headingRenderer('h4'),
          h5: headingRenderer('h5'),
          h6: headingRenderer('h6'),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
