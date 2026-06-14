import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import vm from 'node:vm'

// Rebasing 2026-06-15 after Charts stream + chart CDN card work (measured post-build gzip).
// Measured: HomeJS=70395 DetailJS=62672 HomeTransfer=86158 DetailTransfer=78435 (+8% headroom, rounded up to KiB).
const BUDGETS = {
  homeJsGzip: 75 * 1024,
  detailJsGzip: 67 * 1024,
  homeTransferGzip: 91 * 1024,
  detailTransferGzip: 83 * 1024,
}

function fail(message) {
  console.error(`BUNDLE BUDGET FAIL: ${message}`)
  process.exit(1)
}

if (process.env.BUNDLE_BUDGET_WAIVER?.startsWith('BUNDLE-BUDGET-WAIVER:')) {
  console.log('Bundle budget waived by BUNDLE_BUDGET_WAIVER token.')
  process.exit(0)
}

const transferBudgetWaived = process.env.TRANSFER_BUDGET_WAIVER?.startsWith(
  'TRANSFER-BUDGET-WAIVER:'
)

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

function entryAssetsForAppRoute(routeKey, appPath) {
  const manifestPath = join(
    process.cwd(),
    '.next',
    'server',
    'app',
    appPath,
    'page_client-reference-manifest.js'
  )

  if (!existsSync(manifestPath)) {
    fail(`Missing client reference manifest for ${routeKey}. Run \`next build\` first.`)
  }

  const context = { globalThis: {} }
  vm.runInNewContext(readFileSync(manifestPath, 'utf8'), context)
  const manifest = context.globalThis.__RSC_MANIFEST?.[routeKey]
  const entryKey = `[project]/app/${appPath}/page`
  const jsFiles = manifest?.entryJSFiles?.[entryKey]
  const cssEntries = manifest?.entryCSSFiles?.[entryKey]
  const cssFiles = Array.isArray(cssEntries)
    ? cssEntries
      .map((entry) => {
        if (typeof entry === 'string') return entry
        if (entry && typeof entry.path === 'string') return entry.path
        return null
      })
      .filter(Boolean)
    : []

  if (!Array.isArray(jsFiles) || jsFiles.length === 0) {
    fail(`Could not resolve client JS files for ${routeKey}.`)
  }

  return {
    js: [...new Set(jsFiles.filter((file) => file.endsWith('.js')))],
    css: [...new Set(cssFiles.filter((file) => file.endsWith('.css')))],
  }
}

const homeAssets = entryAssetsForAppRoute('/(main)/page', '(main)')
const detailAssets = entryAssetsForAppRoute(
  '/(main)/nuggets/[id]/[slug]/page',
  '(main)/nuggets/[id]/[slug]'
)
const homeJsSize = gzipBytesForFiles(homeAssets.js)
const detailJsSize = gzipBytesForFiles(detailAssets.js)
const homeTransferSize = gzipBytesForFiles([...homeAssets.js, ...homeAssets.css])
const detailTransferSize = gzipBytesForFiles([...detailAssets.js, ...detailAssets.css])

if (homeJsSize > BUDGETS.homeJsGzip) {
  fail(`Home route JS gzip ${homeJsSize} exceeds ${BUDGETS.homeJsGzip} bytes`)
}

if (detailJsSize > BUDGETS.detailJsGzip) {
  fail(`Detail route JS gzip ${detailJsSize} exceeds ${BUDGETS.detailJsGzip} bytes`)
}

if (!transferBudgetWaived) {
  if (homeTransferSize > BUDGETS.homeTransferGzip) {
    fail(
      `Home route transfer gzip ${homeTransferSize} exceeds ${BUDGETS.homeTransferGzip} bytes`
    )
  }
  if (detailTransferSize > BUDGETS.detailTransferGzip) {
    fail(
      `Detail route transfer gzip ${detailTransferSize} exceeds ${BUDGETS.detailTransferGzip} bytes`
    )
  }
} else {
  console.log('Transfer budget waived by TRANSFER_BUDGET_WAIVER token.')
}

console.log(
  `Bundle budgets passed. HomeJS=${homeJsSize}B DetailJS=${detailJsSize}B ` +
  `HomeTransfer=${homeTransferSize}B DetailTransfer=${detailTransferSize}B`
)
