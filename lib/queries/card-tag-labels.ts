import { formatTagDisplayLabel } from '@/lib/ui/tag-display-label'

type TagLookupRow = {
  slug: string
  label: string
}

type SupabaseErrorLike = {
  message: string
}

type RowWithTagSlugs = Record<string, unknown> & {
  tag_slugs: string[]
}

type TagSelectQuery = {
  in: (
    column: string,
    values: string[]
  ) => PromiseLike<{ data: TagLookupRow[] | null; error: SupabaseErrorLike | null }>
}

export type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => TagSelectQuery
  }
}

export async function attachTagLabelsToRows(
  supabase: SupabaseLike,
  rows: RowWithTagSlugs[]
): Promise<Array<RowWithTagSlugs & { tag_labels: string[] }>> {
  if (rows.length === 0) return []

  const uniqueSlugs = [...new Set(rows.flatMap((row) => row.tag_slugs).filter(Boolean))]
  if (uniqueSlugs.length === 0) {
    return rows.map((row) => ({ ...row, tag_labels: [] }))
  }

  const { data, error } = await supabase
    .from('tags')
    .select('slug, label')
    .in('slug', uniqueSlugs)

  if (error) {
    console.warn(`attachTagLabelsToRows: ${error.message}`)
    return rows.map((row) => ({
      ...row,
      tag_labels: row.tag_slugs.map((slug) => formatTagDisplayLabel(slug)),
    }))
  }

  const labelBySlug = new Map(
    ((data ?? []) as TagLookupRow[]).map((row) => [row.slug, row.label])
  )

  return rows.map((row) => ({
    ...row,
    tag_labels: row.tag_slugs.map((slug) => {
      const label = labelBySlug.get(slug)
      return label ? formatTagDisplayLabel(label) : formatTagDisplayLabel(slug)
    }),
  }))
}
