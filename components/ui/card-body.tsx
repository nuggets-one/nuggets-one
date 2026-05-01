import Link from 'next/link'

type Props = {
  href: string
  title: string
  excerptHtml: string
  displayTagSlugs: string[]
  primaryTag: string | null
  secondaryTag: string | null
  overflowMobile: number
  overflowDesktop: number
}

export function CardBody({
  href,
  title,
  excerptHtml,
  displayTagSlugs,
  primaryTag,
  secondaryTag,
  overflowMobile,
  overflowDesktop,
}: Props) {
  return (
    <div className="flex flex-col flex-1 p-4 gap-2">
      {primaryTag && (
        <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
          <span className="inline-flex shrink-0 max-w-[40%] items-center truncate rounded-full border border-border/80 bg-surface-raised px-1.5 py-0.5 font-medium capitalize text-muted">
            {primaryTag.replace(/-/g, ' ')}
          </span>
          {secondaryTag && (
            <span className="hidden lg:inline lg:max-w-[35%] shrink-0 truncate rounded-full border border-border/70 bg-surface-raised px-1.5 py-0.5 capitalize text-muted/90">
              {secondaryTag.replace(/-/g, ' ')}
            </span>
          )}
          {displayTagSlugs.length >= 3 && (
            <>
              <span className="inline lg:hidden shrink-0 rounded-full border border-border/80 bg-surface-raised px-1.5 py-0.5 font-medium text-muted">
                +{overflowMobile}
              </span>
              <span className="hidden lg:inline shrink-0 rounded-full border border-border/80 bg-surface-raised px-1.5 py-0.5 font-medium text-muted">
                +{overflowDesktop}
              </span>
            </>
          )}
        </div>
      )}

      <Link href={href} className="focus:outline-none min-h-[44px] flex items-start">
        <h2 className="text-base font-semibold leading-snug line-clamp-2 text-primary transition-colors motion-reduce:transition-none group-hover:text-primary/80">
          {title}
        </h2>
      </Link>

      {excerptHtml && (
        <div
          className="text-sm leading-snug tracking-tight text-muted line-clamp-3 lg:line-clamp-4 break-words [&_p]:m-0 [&_p+p]:mt-1 [&_strong]:font-semibold [&_em]:italic [&_code]:rounded [&_code]:bg-surface-raised [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:italic"
          dangerouslySetInnerHTML={{ __html: excerptHtml }}
        />
      )}
    </div>
  )
}
