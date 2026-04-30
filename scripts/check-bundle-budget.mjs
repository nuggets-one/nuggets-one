import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGETS = {
  homeJsGzip: 85 * 1024,
  detailJsGzip: 60 * 1024,
}

function fail(message) {
  console.error(`BUNDLE BUDGET FAIL: ${message}`)
  process.exit(1)
}

if (process.env.BUNDLE_BUDGET_WAIVER?.startsWith('BUNDLE-BUDGET-WAIVER:')) {
  console.log('Bundle budget waived by BUNDLE_BUDGET_WAIVER token.')
  process.exit(0)
}

const manifestPath = join(process.cwd(), '.next', 'build-manifest.json')
if (!existsSync(manifestPath)) {
  fail('Missing .next/build-manifest.json. Run `next build` first.')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const pages = manifest.pages ?? {}
const appPathsManifestPath = join(process.cwd(), '.next', 'server', 'app-paths-manifest.json')

function gzipBytesForFiles(files) {
  let total = 0
  for (const file of files) {
    const filePath = join(process.cwd(), '.next', file)
    if (!existsSync(filePath)) continue
    const raw = readFileSync(filePath)
    total += gzipSync(raw).byteLength
  }
  return total
}

function routeFiles(routeKey) {
  const pageFiles = pages[routeKey]
  if (!Array.isArray(pageFiles)) return []
  return pageFiles.filter((f) => f.endsWith('.js'))
}

function gzipBytesForServerAppRoute(routeKey) {
  if (!existsSync(appPathsManifestPath)) return 0
  const appPathsManifest = JSON.parse(readFileSync(appPathsManifestPath, 'utf8'))
  const appFile = appPathsManifest[routeKey]
  if (!appFile) return 0
  const absoluteFilePath = join(process.cwd(), '.next', 'server', appFile)
  if (!existsSync(absoluteFilePath)) return 0
  const raw = readFileSync(absoluteFilePath)
  return gzipSync(raw).byteLength
}

const homeRoute = routeFiles('/(main)/page')?.length ? '/(main)/page' : '/page'
const detailRoute = '/(main)/nuggets/[id]/[slug]/page'

// Audit S2-F3 decision: enforce frozen Home/detail JS ceilings in CI.
const homeSize = gzipBytesForFiles(routeFiles(homeRoute)) || gzipBytesForServerAppRoute('/(main)/page')
const detailSize = gzipBytesForFiles(routeFiles(detailRoute)) || gzipBytesForServerAppRoute('/(main)/nuggets/[id]/[slug]/page')

if (homeSize === 0 || detailSize === 0) {
  fail('Could not resolve route bundle sizes from Next build manifests.')
}

if (homeSize > BUDGETS.homeJsGzip) {
  fail(`Home route JS gzip ${homeSize} exceeds ${BUDGETS.homeJsGzip} bytes`)
}

if (detailSize > BUDGETS.detailJsGzip) {
  fail(`Detail route JS gzip ${detailSize} exceeds ${BUDGETS.detailJsGzip} bytes`)
}

console.log(`Bundle budgets passed. Home=${homeSize}B Detail=${detailSize}B`)
