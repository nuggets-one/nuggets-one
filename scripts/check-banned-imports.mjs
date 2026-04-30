import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const checks = [
  {
    label: 'No mongoose import in app code',
    pattern: String.raw`from\s+['"]mongoose['"]|require\(['"]mongoose['"]\)`,
    paths: ['app', 'components', 'lib'],
  },
  {
    label: 'No pg import in app code',
    pattern: String.raw`from\s+['"]pg['"]|require\(['"]pg['"]\)`,
    paths: ['app', 'components', 'lib'],
  },
  {
    label: 'No @tanstack imports in app code',
    pattern: String.raw`from\s+['"]@tanstack/|require\(['"]@tanstack/`,
    paths: ['app', 'components', 'lib'],
  },
]

function collectFiles(baseDir) {
  const out = []
  for (const name of readdirSync(baseDir)) {
    const fullPath = join(baseDir, name)
    const info = statSync(fullPath)
    if (info.isDirectory()) {
      out.push(...collectFiles(fullPath))
      continue
    }
    if (/\.(ts|tsx|mts|mjs|js|jsx)$/.test(name)) out.push(fullPath)
  }
  return out
}

let failed = false
for (const check of checks) {
  const regex = new RegExp(check.pattern, 'g')
  const hits = []

  for (const targetPath of check.paths) {
    for (const file of collectFiles(targetPath)) {
      const content = readFileSync(file, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          hits.push(`${file}:${index + 1}:${line.trim()}`)
        }
        regex.lastIndex = 0
      })
    }
  }

  if (hits.length > 0) {
    failed = true
    console.error(`\n[FAIL] ${check.label}`)
    hits.forEach((hit) => console.error(hit))
    continue
  }

  console.log(`[PASS] ${check.label}`)
}

if (failed) process.exit(1)

console.log('\nBanned import checks passed.')
