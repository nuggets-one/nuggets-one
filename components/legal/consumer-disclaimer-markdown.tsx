import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AnchorHTMLAttributes, HTMLAttributes } from 'react'

type Props = {
  markdown: string
  /** Extra Tailwind classes merged onto the markdown wrapper (after defaults). */
  className?: string
  /** When set, replaces the default `text-body-link` anchor styling (e.g. sheet disclaimer). */
  anchorClassName?: string
}

function isSafeExternalHref(href: string): boolean {
  const lower = href.trim().toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return false
  }
  return lower.startsWith('https://') || lower.startsWith('http://')
}

function isSafeInternalHref(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false
  if (href.includes('..')) return false
  return true
}

function DisclaimerAnchor(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & { linkClassName?: string }
) {
  const { href, children, className, linkClassName } = props
  const raw = typeof href === 'string' ? href.trim() : ''
  const defaultLink =
    'font-inherit text-body-link underline-offset-2 transition-colors hover:underline'
  const base = linkClassName ?? defaultLink
  const linkClass = `${base} ${className ?? ''}`.trim()

  if (!raw) {
    return <span className={className}>{children}</span>
  }

  if (isSafeInternalHref(raw)) {
    // Native <a target="_blank">: disclaimer often renders inside an intercepted sheet; `next/link`
    // would soft-navigate the page behind the overlay. New tab keeps the nugget view intact.
    return (
      <a href={raw} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    )
  }

  if (isSafeExternalHref(raw)) {
    return (
      <a
        href={raw}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {children}
      </a>
    )
  }

  return <span className={className}>{children}</span>
}

function DisclaimerParagraph({ className, children }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`my-0 mb-1.5 last:mb-0 ${className ?? ''}`.trim()}>{children}</p>
}

/**
 * Renders site consumer disclaimer as a small subset of Markdown (links, emphasis).
 * No raw-HTML markdown plugins — internal paths use `<a target="_blank">` so links from the detail sheet do not
 * soft-navigate the page behind the overlay; external http(s) also open in a new tab.
 */
export function ConsumerDisclaimerMarkdown({
  markdown,
  className,
  anchorClassName,
}: Props) {
  const defaultWrapper =
    'prose prose-sm max-w-none text-inherit prose-p:text-inherit prose-li:text-inherit prose-strong:text-inherit prose-em:text-inherit prose-p:my-0 prose-p:mb-1.5 prose-p:last:mb-0 prose-ul:my-1 prose-ol:my-1'
  const wrapperClass = [defaultWrapper, className].filter(Boolean).join(' ').trim()

  return (
    <div className={wrapperClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, className: mdClassName }) => (
            <DisclaimerAnchor
              href={typeof href === 'string' ? href : undefined}
              className={mdClassName}
              linkClassName={anchorClassName}
            >
              {children}
            </DisclaimerAnchor>
          ),
          p: ({ children, className }) => (
            <DisclaimerParagraph className={className}>{children}</DisclaimerParagraph>
          ),
          img: () => null,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
