type TagLookupRow = {
  slug: string
  label: string
  dimension: string | null
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
): Promise<Array<RowWithTagSlugs & { tag_labels: string[]; tag_dimensions: (string | null)[] }>> {
  if (rows.length === 0) return []

  const uniqueSlugs = [...new Set(rows.flatMap((row) => row.tag_slugs).filter(Boolean))]
  if (uniqueSlugs.length === 0) {
    return rows.map((row) => ({ ...row, tag_labels: [], tag_dimensions: [] }))
  }

  const { data, error } = await supabase
    .from('tags')
    .select('slug, label, dimension')
    .in('slug', uniqueSlugs)

  if (error) {
    console.warn(`attachTagLabelsToRows: ${error.message}`)
    return rows.map((row) => ({
      ...row,
      tag_labels: row.tag_slugs.slice(),
      tag_dimensions: row.tag_slugs.map(() => null),
    }))
  }

  const tagBySlug = new Map(
    ((data ?? []) as TagLookupRow[]).map((row) => [row.slug, row])
  )

  return rows.map((row) => ({
    ...row,
    tag_labels: row.tag_slugs.map((slug) => {
      const tag = tagBySlug.get(slug)
      const label = tag?.label
      return label != null && label.length > 0 ? label : slug
    }),
    tag_dimensions: row.tag_slugs.map((slug) => tagBySlug.get(slug)?.dimension ?? null),
  }))
}
