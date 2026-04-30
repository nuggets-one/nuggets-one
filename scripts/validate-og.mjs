#!/usr/bin/env node
// scripts/validate-og.mjs
// Usage: node scripts/validate-og.mjs https://your-staging-url.vercel.app
// Optional:
//   OG_PATHS="/,/nuggets/<id>/<slug>" node scripts/validate-og.mjs https://...
//   node scripts/validate-og.mjs https://... --paths="/,/nuggets/<id>/<slug>"
//   node scripts/validate-og.mjs https://... --json
// Exit code 0 = all pass. Exit code 1 = one or more failures.
// PRODUCT §9 — launch-blocking OG validation.

import { JSDOM } from 'jsdom'

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const BASE_URL = positional[0]
const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const pathsArg = args.find((arg) => arg.startsWith('--paths='))?.slice('--paths='.length)

if (!BASE_URL) {
  console.error('Usage: node scripts/validate-og.mjs <base-url>')
  process.exit(1)
}

function parsePaths(input) {
  if (!input) return []
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizePath(path) {
  if (path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

const configuredPaths = parsePaths(pathsArg ?? process.env.OG_PATHS)
const PATHS = (configuredPaths.length > 0 ? configuredPaths : ['/']).map(normalizePath)
const isAbsoluteHttpUrl = (value) => /^https?:\/\//.test(value)

const REQUIRED_HOME = [
  { selector: 'meta[property="og:title"]',       attr: 'content', label: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'content', label: 'og:description' },
  { selector: 'meta[property="og:image"]',       attr: 'content', label: 'og:image (absolute)', test: isAbsoluteHttpUrl },
  { selector: 'meta[name="twitter:card"]',       attr: 'content', label: 'twitter:card' },
]

const REQUIRED_ARTICLE = [
  { selector: 'meta[property="og:title"]',       attr: 'content', label: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'content', label: 'og:description' },
  { selector: 'meta[property="og:image"]',       attr: 'content', label: 'og:image (absolute)', test: isAbsoluteHttpUrl },
  { selector: 'meta[property="og:type"]',        attr: 'content', label: 'og:type', expected: 'article' },
  { selector: 'meta[property="og:url"]',         attr: 'content', label: 'og:url (absolute)', test: isAbsoluteHttpUrl },
  { selector: 'meta[name="twitter:card"]',        attr: 'content', label: 'twitter:card', expected: 'summary_large_image' },
  { selector: 'link[rel="canonical"]',            attr: 'href',    label: 'canonical (absolute)', test: isAbsoluteHttpUrl },
]

async function validateUrl(path) {
  const url = `${BASE_URL}${path}`
  const isArticle = path.startsWith('/nuggets/')
  const checks = isArticle ? REQUIRED_ARTICLE : REQUIRED_HOME

  let html
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
      },
    })
    if (!res.ok) {
      return { url, pass: false, failures: [`HTTP ${res.status}`] }
    }
    html = await res.text()
  } catch (err) {
    return { url, pass: false, failures: [`Fetch error: ${err.message}`] }
  }

  const { window: { document } } = new JSDOM(html)
  const failures = []

  for (const check of checks) {
    const el = document.querySelector(check.selector)
    if (!el) {
      failures.push(`Missing: ${check.label}`)
      continue
    }
    const value = el.getAttribute(check.attr) ?? ''
    if (!value.trim()) {
      failures.push(`Empty: ${check.label}`)
      continue
    }
    if (check.expected && value !== check.expected) {
      failures.push(`${check.label} = "${value}" (expected "${check.expected}")`)
      continue
    }
    if (check.test && !check.test(value)) {
      failures.push(`${check.label} = "${value}" (failed validation)`)
    }
  }

  return { url, pass: failures.length === 0, failures }
}

async function main() {
  if (!jsonMode) {
    console.log(`\nNuggets OG Validator — ${BASE_URL}\n${'─'.repeat(60)}`)
    console.log(`Paths: ${PATHS.join(', ')}`)
  }

  let allPass = true
  const results = []
  for (const path of PATHS) {
    const result = await validateUrl(path)
    results.push(result)
    if (result.pass) {
      if (!jsonMode) console.log(`✅  PASS  ${result.url}`)
    } else {
      allPass = false
      if (!jsonMode) console.log(`❌  FAIL  ${result.url}`)
      for (const f of result.failures) {
        if (!jsonMode) console.log(`         → ${f}`)
        console.log(`::error file=scripts/validate-og.mjs,title=OG validation::${result.url} -> ${f}`)
      }
    }
  }

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          paths: PATHS,
          allPass,
          results,
        },
        null,
        2
      )
    )
  } else {
    console.log(`${'─'.repeat(60)}`)
  }

  if (allPass) {
    if (!jsonMode) console.log('All checks passed.\n')
    process.exit(0)
  } else {
    if (!jsonMode) console.log('One or more checks failed. Fix before production launch.\n')
    process.exit(1)
  }
}

main()
