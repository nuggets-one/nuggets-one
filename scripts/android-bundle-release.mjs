#!/usr/bin/env node
/**
 * Build release Android App Bundle (app-release.aab) via Gradle bundleRelease.
 * Resolves JAVA_HOME when missing (common on Windows without java on PATH).
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ANDROID = path.join(ROOT, 'android')
const GRADLEW = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'
const AAB_PATH = path.join(
  ANDROID,
  'app',
  'build',
  'outputs',
  'bundle',
  'release',
  'app-release.aab'
)
const KEYSTORE_PROPS = path.join(ANDROID, 'keystore.properties')

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile()
  } catch {
    return false
  }
}

function dirHasJava(dir) {
  const javaExe =
    process.platform === 'win32'
      ? path.join(dir, 'bin', 'java.exe')
      : path.join(dir, 'bin', 'java')
  return fileExists(javaExe)
}

function readGradleJavaHome() {
  const propsPath = path.join(ANDROID, 'gradle.properties')
  if (!fileExists(propsPath)) return null
  const text = fs.readFileSync(propsPath, 'utf8')
  const match = text.match(/^\s*org\.gradle\.java\.home\s*=\s*(.+)\s*$/m)
  if (!match) return null
  const raw = match[1].trim().replace(/^["']|["']$/g, '')
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(ANDROID, raw)
  return dirHasJava(resolved) ? resolved : null
}

function studioJbrCandidates() {
  const localAppData = process.env.LOCALAPPDATA
  const programFiles = process.env.ProgramFiles
  const programFilesX86 = process.env['ProgramFiles(x86)']
  const candidates = []
  if (programFiles) {
    candidates.push(path.join(programFiles, 'Android', 'Android Studio', 'jbr'))
  }
  if (programFilesX86) {
    candidates.push(path.join(programFilesX86, 'Android', 'Android Studio', 'jbr'))
  }
  if (localAppData) {
    candidates.push(path.join(localAppData, 'Programs', 'Android Studio', 'jbr'))
  }
  return candidates
}

function resolveJavaHome() {
  const fromEnv = process.env.JAVA_HOME?.trim()
  if (fromEnv && dirHasJava(fromEnv)) return fromEnv

  const fromGradle = readGradleJavaHome()
  if (fromGradle) return fromGradle

  for (const candidate of studioJbrCandidates()) {
    if (dirHasJava(candidate)) return candidate
  }

  return null
}

function printJavaHelp() {
  console.error('\nJAVA_HOME is not set and Android Studio JBR was not found.')
  console.error('Set JAVA_HOME to Android Studio\'s bundled JDK, then re-run:\n')
  if (process.platform === 'win32') {
    console.error(
      "  $env:JAVA_HOME = 'C:\\Program Files\\Android\\Android Studio\\jbr'"
    )
    console.error('  npm run cap:bundle:android\n')
  } else {
    console.error(
      "  export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'"
    )
    console.error('  npm run cap:bundle:android\n')
  }
}

const javaHome = resolveJavaHome()
if (!javaHome) {
  printJavaHelp()
  process.exit(1)
}

console.log(`Using JAVA_HOME: ${javaHome}`)

const gradle = spawnSync(GRADLEW, ['bundleRelease'], {
  cwd: ANDROID,
  env: { ...process.env, JAVA_HOME: javaHome },
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (gradle.status !== 0) {
  process.exit(gradle.status ?? 1)
}

if (!fileExists(AAB_PATH)) {
  console.error(`\nGradle finished but AAB not found at:\n  ${AAB_PATH}`)
  process.exit(1)
}

const stat = fs.statSync(AAB_PATH)
const signed = fs.existsSync(KEYSTORE_PROPS)
console.log('\n=== Release AAB ready ===')
console.log(`Path: ${AAB_PATH}`)
console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(2)} MiB`)
console.log(
  signed
    ? 'Signing: release (android/keystore.properties present)'
    : 'Signing: none — add android/keystore.properties or use Play/App Signing before upload'
)
