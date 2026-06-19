import Link from 'next/link'
import { TagDimensionBadge } from '@/app/admin/tags/_components/tag-dimension-badge'
import { TagOfficialBadge } from '@/app/admin/tags/_components/tag-official-badge'
import type { TagAdminRow } from '@/lib/queries/tags-admin'

type Props = {
  rows: TagAdminRow[]
}

const thClassName = 'px-2 py-1.5 font-semibold'
const tdClassName = 'px-2 py-1 align-middle'

export function TagsTableDesktop({ rows }: Props) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[24%]" />
          <col className="w-[12%]" />
          <col className="w-[11%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-surface-raised text-[10px] uppercase tracking-wide text-muted">
            <th className={thClassName}>Label</th>
            <th className={thClassName}>Slug</th>
            <th className={thClassName}>Dimension</th>
            <th className={thClassName}>Official</th>
            <th className={`${thClassName} text-right`}>Nuggets</th>
            <th className={`${thClassName} text-right`}>Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tag) => (
            <tr
              key={tag.id}
              className="border-b border-border last:border-0 hover:bg-surface-raised/80"
            >
              <td className={`${tdClassName} font-medium text-primary`}>
                <Link
                  href={`/admin/tags/${tag.id}`}
                  title={tag.label}
                  className="block truncate hover:text-accent hover:underline"
                >
                  {tag.label}
                </Link>
              </td>
              <td className={`${tdClassName} font-mono text-[11px] text-muted`}>
                <span className="block truncate" title={tag.slug}>
                  {tag.slug}
                </span>
              </td>
              <td className={tdClassName}>
                <TagDimensionBadge dimension={tag.dimension} compact />
              </td>
              <td className={tdClassName}>
                <TagOfficialBadge isOfficial={tag.is_official} compact />
              </td>
              <td className={`${tdClassName} text-right tabular-nums text-muted`}>
                {tag.article_count}
              </td>
              <td className={`${tdClassName} text-right`}>
                <Link
                  href={`/admin/tags/${tag.id}`}
                  className="font-medium text-accent hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
