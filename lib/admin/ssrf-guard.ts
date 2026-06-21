import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
])

function isPrivateOrReservedIp(address: string): boolean {
  if (!isIP(address)) return false

  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true

  if (address.includes(':')) {
    const lower = address.toLowerCase()
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
    if (lower.startsWith('fe80')) return true
    return false
  }

  const parts = address.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true

  const [a, b] = parts
  if (a === 127) return true
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  if (a === 0) return true
  if (a >= 224) return true

  return false
}

function hostnameLooksBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (BLOCKED_HOSTNAMES.has(host)) return true
  if (host.endsWith('.localhost')) return true
  if (host.endsWith('.internal')) return true
  if (host.endsWith('.local')) return true
  return false
}

export type SsrfValidationResult =
  | { ok: true; url: URL }
  | { ok: false; code: 'invalid_url' | 'blocked_host' }

/** Validate an outbound fetch URL and reject private/reserved targets (SSRF). */
export async function validateOutboundUrl(raw: string): Promise<SsrfValidationResult> {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return { ok: false, code: 'invalid_url' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, code: 'invalid_url' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, code: 'invalid_url' }
  }

  const hostname = parsed.hostname
  if (!hostname || hostnameLooksBlocked(hostname)) {
    return { ok: false, code: 'blocked_host' }
  }

  const literalIp = isIP(hostname)
  if (literalIp && isPrivateOrReservedIp(hostname)) {
    return { ok: false, code: 'blocked_host' }
  }

  if (!literalIp) {
    try {
      const records = await lookup(hostname, { all: true, verbatim: true })
      if (records.length === 0) {
        return { ok: false, code: 'blocked_host' }
      }
      for (const record of records) {
        if (isPrivateOrReservedIp(record.address)) {
          return { ok: false, code: 'blocked_host' }
        }
      }
    } catch {
      return { ok: false, code: 'blocked_host' }
    }
  }

  return { ok: true, url: parsed }
}
