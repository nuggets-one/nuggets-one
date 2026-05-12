import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AnchorHTMLAttributes } from 'react'

type Props = {
  markdown: string
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

export function ArticleBody({ markdown }: Props) {
  return (
    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs text-muted
      prose-headings:text-xs prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-primary
      prose-p:text-xs prose-li:text-xs prose-strong:text-primary
      prose-a:no-underline prose-a:underline-offset-2
      prose-img:rounded-lg prose-img:my-6
      prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted
      prose-code:bg-surface-raised prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs
      prose-pre:bg-surface-raised prose-pre:rounded-xl prose-pre:border prose-pre:border-border">
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
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
