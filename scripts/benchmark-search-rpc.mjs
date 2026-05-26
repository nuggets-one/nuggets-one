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
    const suggestSample = await timeCall('search_suggestions_ranked', async () => {
      const { data, error } = await supabase.rpc('search_suggestions_ranked', {
        p_stream: STREAM,
        p_q: q,
        p_limit: 8,
      })
      if (error) throw error
      return Array.isArray(data) ? data.length : 0
    })
    samples.push({
      iteration: i + 1,
      searchMs: searchSample.elapsedMs,
      suggestMs: suggestSample.elapsedMs,
      searchRows: searchSample.result,
      suggestRows: suggestSample.result,
    })
  }

  const searchAvgMs =
    Number((samples.reduce((sum, sample) => sum + sample.searchMs, 0) / samples.length).toFixed(2))
  const suggestAvgMs =
    Number((samples.reduce((sum, sample) => sum + sample.suggestMs, 0) / samples.length).toFixed(2))

  return {
    q,
    stream: STREAM,
    iterations: ITERATIONS,
    searchAvgMs,
    suggestAvgMs,
    samples,
  }
}

async function main() {
  const results = []
  for (const query of QUERIES) {
    // Run serially to reduce contention noise and keep output stable.
    results.push(await benchmarkQuery(query))
  }

  const timestamp = Date.now()
  const outputDir = join(process.cwd(), 'scripts', 'benchmark-output')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = join(outputDir, `search-rpc-benchmark.${timestamp}.json`)
  writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))

  console.log(`Search benchmark complete: ${outputPath}`)
}

main().catch((error) => {
  console.error('Search benchmark failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
