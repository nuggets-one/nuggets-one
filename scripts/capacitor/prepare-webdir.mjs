import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const webDir = join(process.cwd(), 'mobile-web')
const indexPath = join(webDir, 'index.html')

const placeholderHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nuggets Mobile Shell</title>
  </head>
  <body>
    <p>This placeholder exists only for Capacitor copy/sync in hosted mode.</p>
  </body>
</html>
`

await mkdir(webDir, { recursive: true })
await writeFile(indexPath, placeholderHtml, 'utf8')

console.log(`Prepared Capacitor webDir at ${indexPath}`)
