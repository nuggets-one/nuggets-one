import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY for search benchmark.')
  process.exit(1)
}

const ITERATIONS = Number.parseInt(process.env.SEARCH_BENCH_ITERATIONS ?? '5', 10)
const STREAM = process.env.SEARCH_BENCH_STREAM === 'pulse' ? 'pulse' : 'standard'
const QUERIES = (process.env.SEARCH_BENCH_QUERIES ??
  'ai,market,interest rates,chip design,geopolitics')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function timeCall(label, fn) {
  const startedAt = performance.now()
  const result = await fn()
  const elapsedMs = Number((performance.now() - startedAt).toFixed(2))
  return { label, elapsedMs, result }
}

async function benchmarkQuery(q) {
  const samples = []
  for (let i = 0; i < ITERATIONS; i += 1) {
    const searchSample = await timeCall('search_articles_ranked', async () => {
      const { data, error } = await supabase.rpc('search_articles_ranked', {
        p_stream: STREAM,
        p_tags: [],
        p_q: q,
        p_limit: 24,
      })
      if (error) throw error
      return Array.isArray(data) ? data.length : 0
    })
    // Global-by-default path: no stream/scope filter.
    const globalSample = await timeCall('search_articles_ranked (global)', async () => {
      const { data, error } = await supabase.rpc('search_articles_ranked', {
        p_stream: 'all',
        p_tags: [],
        p_q: q,
        p_limit: 24,
      })
      if (error) throw error
      return Array.isArray(data) ? data.length : 0
    })
    const suggestSample = await timeCall('search_suggestions_ranked', async () => {
      const { data, error } = await supabase.rpc('search_suggestions_ranked', {
        p_stream: 'all',
        p_q: q,
        p_limit: 8,
      })
      if (error) throw error
      return Array.isArray(data) ? data.length : 0
    })
    // Trigram fallback path (typo/partial tolerance). Tolerate absence of the
    // RPC so the benchmark still runs before migration 039 is applied.
    const trigramSample = await timeCall('search_articles_trigram', async () => {
      const { data, error } = await supabase.rpc('search_articles_trigram', {
        p_stream: 'all',
        p_tags: [],
        p_q: q,
        p_limit: 24,
      })
      if (error) return null
      return Array.isArray(data) ? data.length : 0
    })
    samples.push({
      iteration: i + 1,
      searchMs: searchSample.elapsedMs,
      globalMs: globalSample.elapsedMs,
      suggestMs: suggestSample.elapsedMs,
      trigramMs: trigramSample.elapsedMs,
      searchRows: searchSample.result,
      globalRows: globalSample.result,
      suggestRows: suggestSample.result,
      trigramRows: trigramSample.result,
    })
  }

  const avg = (key) =>
    Number((samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length).toFixed(2))

  return {
    q,
    stream: STREAM,
    iterations: ITERATIONS,
    searchAvgMs: avg('searchMs'),
    globalAvgMs: avg('globalMs'),
    suggestAvgMs: avg('suggestMs'),
    trigramAvgMs: avg('trigramMs'),
    samples,
  }
}

async function countGlobalSearch(q) {
  const { data, error } = await supabase.rpc('search_articles_ranked', {
    p_stream: 'all',
    p_tags: [],
    p_q: q,
    p_limit: 24,
  })
  if (error) throw error
  return Array.isArray(data) ? data.length : 0
}

async function countSuggestions(q) {
  const { data, error } = await supabase.rpc('search_suggestions_ranked', {
    p_stream: 'all',
    p_q: q,
    p_limit: 8,
  })
  if (error) throw error
  return Array.isArray(data) ? data.length : 0
}

// Introduce a plausible typo: swap two adjacent chars of the first long word.
function typoVariant(text) {
  const words = text.trim().split(/\s+/)
  const idx = words.findIndex((w) => w.length >= 4)
  if (idx === -1) return text
  const w = words[idx]
  const mid = Math.floor(w.length / 2)
  words[idx] = w.slice(0, mid - 1) + w[mid] + w[mid - 1] + w.slice(mid + 1)
  return words.join(' ')
}

// Build recall cases from a real title so we exercise the three failure modes
// the migration fixes: full paste (AND cliff), partial prefix, and typo.
function buildRecallCases() {
  const title = process.env.SEARCH_BENCH_TITLE?.trim()
  if (!title) return []
  const words = title.split(/\s+/).filter(Boolean)
  const firstWord = words[0] ?? title
  const prefix = firstWord.slice(0, Math.max(3, firstWord.length - 2))
  const fragment = words.slice(0, 3).join(' ')
  return [
    { kind: 'pasted-title', q: title },
    { kind: 'fragment (3 words)', q: fragment },
    { kind: 'prefix (partial word)', q: prefix },
    { kind: 'typo', q: typoVariant(title) },
  ]
}

async function runRecallCases() {
  const cases = buildRecallCases()
  if (cases.length === 0) {
    console.log('Recall cases skipped (set SEARCH_BENCH_TITLE to a real nugget title to enable).')
    return { cases: [], zeroResultRate: null }
  }

  const results = []
  for (const testCase of cases) {
    const searchSample = await timeCall('recall.search', () => countGlobalSearch(testCase.q))
    const suggestSample = await timeCall('recall.suggest', () => countSuggestions(testCase.q))
    results.push({
      kind: testCase.kind,
      q: testCase.q,
      searchRows: searchSample.result,
      suggestRows: suggestSample.result,
      searchMs: searchSample.elapsedMs,
      suggestMs: suggestSample.elapsedMs,
    })
  }

  const zeros = results.filter((r) => r.searchRows === 0 || r.suggestRows === 0)
  const zeroResultRate = Number((zeros.length / results.length).toFixed(2))

  console.log('\n--- Recall cases (global path) ---')
  for (const r of results) {
    const flag = r.searchRows === 0 || r.suggestRows === 0 ? 'ZERO' : 'ok'
    console.log(
      `  [${flag}] ${r.kind}: search=${r.searchRows} (${r.searchMs}ms), suggest=${r.suggestRows} (${r.suggestMs}ms) — "${r.q}"`
    )
  }
  console.log(`Zero-result rate: ${zeroResultRate}`)

  return { cases: results, zeroResultRate }
}

async function main() {
  const results = []
  for (const query of QUERIES) {
    // Run serially to reduce contention noise and keep output stable.
    results.push(await benchmarkQuery(query))
  }

  const recall = await runRecallCases()

  const timestamp = Date.now()
  const outputDir = join(process.cwd(), 'scripts', 'benchmark-output')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = join(outputDir, `search-rpc-benchmark.${timestamp}.json`)
  writeFileSync(
    outputPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), results, recall }, null, 2)
  )

  console.log(`Search benchmark complete: ${outputPath}`)

  // Opt-in gate for CI: fail if any recall case returned zero rows.
  if (process.env.SEARCH_BENCH_ASSERT === '1' && recall.zeroResultRate) {
    console.error(`Recall assertion failed: zero-result rate ${recall.zeroResultRate} > 0.`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Search benchmark failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
