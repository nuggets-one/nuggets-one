import Link from 'next/link'
import { collectionsBrowseHref } from '@/lib/collections/browse-params'

type Crumb = {
  id: string
  title: string
}

type Props = {
  q?: string
  parent: Crumb
  sub?: Crumb | null
}

const crumbLinkClasses = 'hover:text-primary hover:underline'
const crumbCurrentClasses = 'font-medium text-primary'

export function CollectionsBrowseBreadcrumbs({ q, parent, sub }: Props) {
  const rootHref = collectionsBrowseHref({ q })
  const parentHref = collectionsBrowseHref({ q, parent: parent.id })

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-y-1">
        <li className="inline-flex items-center">
          <Link href={rootHref} className={crumbLinkClasses}>
            Collections
          </Link>
        </li>
        <li className="inline-flex items-center" aria-hidden="true">
          <span className="mx-2 text-muted/60">/</span>
        </li>
        <li className="inline-flex min-w-0 items-center">
          {sub ? (
            <Link href={parentHref} className={`${crumbLinkClasses} truncate`}>
              {parent.title}
            </Link>
          ) : (
            <span className={`${crumbCurrentClasses} truncate`}>{parent.title}</span>
          )}
        </li>
        {sub && (
          <>
            <li className="inline-flex items-center" aria-hidden="true">
              <span className="mx-2 text-muted/60">/</span>
            </li>
            <li className="inline-flex min-w-0 items-center">
              <span className={`${crumbCurrentClasses} truncate`}>{sub.title}</span>
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}
