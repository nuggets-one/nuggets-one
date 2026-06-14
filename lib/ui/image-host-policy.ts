/**
 * Single source of truth for hosts that Next/Image can render directly.
 * Keep this list aligned with `next.config.ts` CSP and remotePatterns.
 *
 * Tier 1 (passthrough, `unoptimized` on card `<Image>`): high-volume legacy
 * UGC CDNs from migrated Mongo heroes — avoids brittle Cloudinary fetch for hosts
 * that already allow hotlinking.
 *
 * Tier 2: `res.cloudinary.com` uploads + `i.ytimg.com` posters (optimized).
 * Other hosts still route through Cloudinary `image/fetch` when configured.
 */
export const IMAGE_REMOTE_HOSTS = [
  'res.cloudinary.com',
  'i.ytimg.com',
  'pbs.twimg.com',
  'i.redd.it',
  'preview.redd.it',
  'i.imgur.com',
  'media.licdn.com',
  'images.ctfassets.net',
  'substackcdn.com',
  // Legacy migration heroes (hotlink-friendly publisher CDNs)
  'cdn.prod.website-files.com',
  'm.media-amazon.com',
  'www.apolloacademy.com',
  'www.apollo.com',
  'i0.wp.com',
  'storage.ghost.io',
  'sherwoodnews.imgix.net',
  'menlovc.com',
  'research-assets.cbinsights.com',
  'd1lamhf6l6yk6d.cloudfront.net',
  'assets.aboutamazon.com',
  'a.storyblok.com',
  'blogger.googleusercontent.com',
  'infobeautiful4.s3.amazonaws.com',
  'cdn.jpmorganfunds.com',
  'am.gs.com',
] as const

const PASSTHROUGH_HOSTS = new Set<string>(IMAGE_REMOTE_HOSTS)

/** Hostname allowed for direct (unoptimized) card `<Image>` without Cloudinary fetch. */
export function isPassthroughImageHost(hostname: string): boolean {
  return PASSTHROUGH_HOSTS.has(hostname.toLowerCase())
}

