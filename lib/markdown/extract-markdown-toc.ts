import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { slugify } from '@shared/slug'

export type MarkdownTocItem = {
  id: string
  text: string
}

/** Loose mdast-like node shape from remark-parse (no extra @types/mdast dependency). */
type MdNode = {
  type: string
  depth?: number
  value?: string
  children?: MdNode[]
}

function extractInlineText(n: MdNode): string {
  if (n.type === 'text' && typeof n.value === 'string') return n.value
  if (n.type === 'inlineCode' && typeof n.value === 'string') return n.value
  if (Array.isArray(n.children)) {
    return n.children.map(extractInlineText).join('')
  }
  return ''
}

function headingPlainText(h: MdNode): string {
  if (h.type !== 'heading' || !Array.isArray(h.children)) return ''
  return h.children.map(extractInlineText).join('').trim()
}

function collectHeadings(nodes: MdNode[] | undefined, acc: MdNode[]): void {
  if (!nodes) return
  for (const n of nodes) {
    if (n.type === 'heading') acc.push(n)
    if (Array.isArray(n.children)) collectHeadings(n.children, acc)
  }
}

export type MarkdownTocExtraction = {
  items: MarkdownTocItem[]
  /** Depth used for TOC rows (`h2` when any `##` exists, else shallowest). */
  pickDepth: number | null
  /**
   * Parallel to every heading in document order (all levels): `id` when this
   * heading is a TOC anchor, else `undefined`.
   */
  headingIdByPosition: (string | undefined)[]
}

/**
 * Build "On this page" entries from real markdown headings (not a hardcoded list).
 * Prefers `##` (depth 2) when any exist; otherwise uses the shallowest heading depth
 * present. Skips a lone leading `#` only when multiple same-depth headings suggest the
 * first is the document title.
 */
export function extractMarkdownToc(markdown: string): MarkdownTocExtraction {
  const trimmed = markdown.trim()
  if (!trimmed) {
    return { items: [], pickDepth: null, headingIdByPosition: [] }
  }

  const tree = unified().use(remarkParse).parse(trimmed) as MdNode
  const headings: MdNode[] = []
  if (Array.isArray(tree.children)) collectHeadings(tree.children, headings)

  const parsed = headings
    .filter((h) => typeof h.depth === 'number' && h.depth >= 1 && h.depth <= 6)
    .map((h) => ({
      depth: h.depth as number,
      text: headingPlainText(h),
    }))
    .filter((h) => h.text.length > 0)

  if (parsed.length === 0) {
    return { items: [], pickDepth: null, headingIdByPosition: [] }
  }

  const hasH2 = parsed.some((h) => h.depth === 2)
  const pickDepth = hasH2 ? 2 : Math.min(...parsed.map((h) => h.depth))

  const depthMatchIndices: number[] = []
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i].depth === pickDepth) depthMatchIndices.push(i)
  }
  const skipFirst =
    pickDepth === 1 && depthMatchIndices.length > 1 ? 1 : 0
  const anchoredIndices = depthMatchIndices.slice(skipFirst)

  const used = new Map<string, number>()
  const items: MarkdownTocItem[] = []
  const headingIdByPosition: (string | undefined)[] = parsed.map(() => undefined)

  for (const idx of anchoredIndices) {
    const text = parsed[idx].text
    const base = slugify(text)
    if (!base) continue
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    const id = n === 1 ? base : `${base}-${n}`
    items.push({ id, text })
    headingIdByPosition[idx] = id
  }

  return { items, pickDepth, headingIdByPosition }
}
