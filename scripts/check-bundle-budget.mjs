import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import vm from 'node:vm'

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

function entryJsFilesForAppRoute(routeKey, appPath) {
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
  const files = manifest?.entryJSFiles?.[`[project]/app/${appPath}/page`]

  if (!Array.isArray(files) || files.length === 0) {
    fail(`Could not resolve client JS files for ${routeKey}.`)
  }

  return files.filter((file) => file.endsWith('.js'))
}

const homeSize = gzipBytesForFiles(
  entryJsFilesForAppRoute('/(main)/page', '(main)')
)
const detailSize = gzipBytesForFiles(
  entryJsFilesForAppRoute('/(main)/nuggets/[id]/[slug]/page', '(main)/nuggets/[id]/[slug]')
)

if (homeSize > BUDGETS.homeJsGzip) {
  fail(`Home route JS gzip ${homeSize} exceeds ${BUDGETS.homeJsGzip} bytes`)
}

if (detailSize > BUDGETS.detailJsGzip) {
  fail(`Detail route JS gzip ${detailSize} exceeds ${BUDGETS.detailJsGzip} bytes`)
}

console.log(`Bundle budgets passed. Home=${homeSize}B Detail=${detailSize}B`)
