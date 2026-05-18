#!/usr/bin/env node
// scripts/validate-og.mjs
// Usage: node scripts/validate-og.mjs https://your-staging-url.vercel.app
// Optional:
//   OG_PATHS="/,/nuggets/<id>/<slug>" node scripts/validate-og.mjs https://...
//   node scripts/validate-og.mjs https://... --paths="/,/nuggets/<id>/<slug>"
//   node scripts/validate-og.mjs https://... --json
// Exit code 0 = all pass. Exit code 1 = one or more failures.
// PRODUCT §9 — launch-blocking OG validation.
//
// CI: set OG_PATHS to "/" plus at least one published nugget path, e.g.
//   OG_PATHS="/,/nuggets/<uuid>/<slug>" npm run validate:og -- https://deploy-url

import { JSDOM } from 'jsdom'

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const BASE_URL = positional[0]?.replace(/\/+$/, '')
const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const pathsArg = args.find((arg) => arg.startsWith('--paths='))?.slice('--paths='.length)

const TITLE_MAX_LEN = 70
const META_DESCRIPTION_MAX_LEN = 200
const OG_DESCRIPTION_MAX_LEN = 155
const OG_IMAGE_MAX_BYTES = 5 * 1024 * 1024

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

function normalizeComparableUrl(value) {
  try {
    const parsed = new URL(value)
    parsed.hash = ''
    let pathname = parsed.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    parsed.pathname = pathname
    return parsed.toString()
  } catch {
    return value.trim()
  }
}

const configuredPaths = parsePaths(pathsArg ?? process.env.OG_PATHS)
const PATHS = (configuredPaths.length > 0 ? configuredPaths : ['/']).map(normalizePath)
const isAbsoluteHttpUrl = (value) => /^https:\/\//.test(value)

const REQUIRED_HOME = [
  { selector: 'meta[property="og:title"]', attr: 'content', label: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'content', label: 'og:description' },
  { selector: 'meta[property="og:image"]', attr: 'content', label: 'og:image (absolute https)', test: isAbsoluteHttpUrl },
  { selector: 'meta[name="twitter:card"]', attr: 'content', label: 'twitter:card' },
]

const REQUIRED_ARTICLE = [
  { selector: 'meta[property="og:title"]', attr: 'content', label: 'og:title' },
  { selector: 'meta[property="og:description"]', attr: 'content', label: 'og:description' },
  { selector: 'meta[property="og:image"]', attr: 'content', label: 'og:image (absolute https)', test: isAbsoluteHttpUrl },
  { selector: 'meta[property="og:type"]', attr: 'content', label: 'og:type', expected: 'article' },
  { selector: 'meta[property="og:url"]', attr: 'content', label: 'og:url (absolute https)', test: isAbsoluteHttpUrl },
  { selector: 'meta[name="twitter:card"]', attr: 'content', label: 'twitter:card', expected: 'summary_large_image' },
  { selector: 'link[rel="canonical"]', attr: 'href', label: 'canonical (absolute https)', test: isAbsoluteHttpUrl },
]

function metaContent(document, selector) {
  const el = document.querySelector(selector)
  return el?.getAttribute('content')?.trim() ?? ''
}

async function headOgImage(imageUrl) {
  const failures = []
  let res
  try {
    res = await fetch(imageUrl, { method: 'HEAD', redirect: 'follow' })
  } catch (err) {
    return [`og:image HEAD failed: ${err.message}`]
  }

  if (!res.ok) {
    failures.push(`og:image HEAD HTTP ${res.status}`)
    return failures
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    failures.push(`og:image Content-Type = "${contentType}" (expected image/*)`)
  }

  const lengthHeader = res.headers.get('content-length')
  if (lengthHeader) {
    const bytes = Number.parseInt(lengthHeader, 10)
    if (Number.isFinite(bytes) && bytes > OG_IMAGE_MAX_BYTES) {
      failures.push(`og:image size ${bytes} bytes (max ${OG_IMAGE_MAX_BYTES})`)
    }
  }

  return failures
}

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
      redirect: 'follow',
    })
    if (!res.ok) {
      return { url, pass: false, failures: [`HTTP ${res.status}`] }
    }
    html = await res.text()
  } catch (err) {
    return { url, pass: false, failures: [`Fetch error: ${err.message}`] }
  }

  const {
    window: { document },
  } = new JSDOM(html)
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

  const pageTitle = document.title?.trim() ?? ''
  const ogTitle = metaContent(document, 'meta[property="og:title"]')
  if (!pageTitle) {
    failures.push('Empty: <title>')
  } else if (pageTitle.length > TITLE_MAX_LEN) {
    failures.push(`<title> length ${pageTitle.length} (max ${TITLE_MAX_LEN})`)
  }
  if (ogTitle && pageTitle && pageTitle !== ogTitle) {
    failures.push(`<title> "${pageTitle}" !== og:title "${ogTitle}"`)
  }

  const metaDescription = metaContent(document, 'meta[name="description"]')
  const ogDescription = metaContent(document, 'meta[property="og:description"]')
  if (metaDescription.length > META_DESCRIPTION_MAX_LEN) {
    failures.push(
      `meta description length ${metaDescription.length} (max ${META_DESCRIPTION_MAX_LEN})`
    )
  }
  if (ogDescription.length > OG_DESCRIPTION_MAX_LEN) {
    failures.push(
      `og:description length ${ogDescription.length} (max ${OG_DESCRIPTION_MAX_LEN})`
    )
  }

  if (isArticle) {
    const ogUrl = metaContent(document, 'meta[property="og:url"]')
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() ?? ''
    const expectedUrl = normalizeComparableUrl(url)
    if (ogUrl && normalizeComparableUrl(ogUrl) !== expectedUrl) {
      failures.push(`og:url "${ogUrl}" !== page URL "${url}"`)
    }
    if (canonical && normalizeComparableUrl(canonical) !== expectedUrl) {
      failures.push(`canonical "${canonical}" !== page URL "${url}"`)
    }
    if (ogUrl && canonical && normalizeComparableUrl(ogUrl) !== normalizeComparableUrl(canonical)) {
      failures.push(`og:url "${ogUrl}" !== canonical "${canonical}"`)
    }
  }

  const ogImage = metaContent(document, 'meta[property="og:image"]')
  if (ogImage && isAbsoluteHttpUrl(ogImage)) {
    const imageFailures = await headOgImage(ogImage)
    failures.push(...imageFailures)
  }

  return { url, pass: failures.length === 0, failures }
}

async function main() {
  if (!jsonMode) {
    console.log(`\nNuggets OG Validator — ${BASE_URL}\n${'─'.repeat(60)}`)
    console.log(`Paths: ${PATHS.join(', ')}`)
    if (PATHS.length === 1 && PATHS[0] === '/') {
      console.log(
        'Tip: set OG_PATHS="/,/nuggets/<uuid>/<slug>" to validate a published nugget.\n'
      )
    }
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
