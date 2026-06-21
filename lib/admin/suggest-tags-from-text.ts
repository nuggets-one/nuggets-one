export type TagSuggestionInput = {
  slug: string
  label: string
  dimension: string
}

type KeywordRule = {
  pattern: RegExp
  slugs: string[]
}

const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /\bgeopolitic|\bukraine\b|\bnato\b|\bwar\b|\bconflict\b|\bdiplomacy\b/i, slugs: ['geopolitics'] },
  { pattern: /\bventure capital\b|\bvc\b|\bseries [a-d]\b|\bfunding\b|\bstartup\b|\bpe-vc\b/i, slugs: ['pe-vc'] },
  { pattern: /\bartificial intelligence\b|\bai\b|\bmachine learning\b|\bllm\b|\bgpt\b/i, slugs: ['ai'] },
  { pattern: /\bsemiconductor\b|\bchip\b|\bnvidia\b|\btsmc\b/i, slugs: ['semiconductors'] },
  { pattern: /\btechnology\b|\btech\b|\bsoftware\b|\bhardware\b/i, slugs: ['technology'] },
  { pattern: /\bpodcast\b|\binterview\b|\bep(?:isode)?\.?\s*\d+/i, slugs: ['podcast'] },
  { pattern: /\bchart\b|\bdata viz\b|\bvisualization\b|\binfographic\b/i, slugs: [] },
]

/** Suggest official tag slugs from title + description text (rule-based, no AI). */
export function suggestTagsFromText(
  text: string,
  officialTags: TagSuggestionInput[],
): string[] {
  const haystack = text.trim()
  if (!haystack || officialTags.length === 0) return []

  const officialBySlug = new Map(officialTags.map((tag) => [tag.slug, tag]))
  const suggestions = new Set<string>()

  for (const rule of KEYWORD_RULES) {
    if (!rule.pattern.test(haystack)) continue
    for (const slug of rule.slugs) {
      if (officialBySlug.has(slug)) suggestions.add(slug)
    }
  }

  for (const tag of officialTags) {
    const label = tag.label.trim()
    if (label.length >= 3 && haystack.toLowerCase().includes(label.toLowerCase())) {
      suggestions.add(tag.slug)
    }

    const slugPhrase = tag.slug.replace(/-/g, ' ')
    if (slugPhrase.length >= 3 && haystack.toLowerCase().includes(slugPhrase)) {
      suggestions.add(tag.slug)
    }
  }

  return [...suggestions]
}

/** Optional stream hint from fetched text (admin confirms manually). */
export function suggestStreamFromText(text: string): 'charts' | null {
  if (/\bchart\b|\bdata viz\b|\bvisualization\b|\binfographic\b/i.test(text)) {
    return 'charts'
  }
  return null
}
