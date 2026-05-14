/**
 * Single source of truth for hosts that Next/Image can render directly.
 * Keep this list aligned with `next.config.ts` CSP and remotePatterns.
 */
export const IMAGE_REMOTE_HOSTS = ['res.cloudinary.com', 'i.ytimg.com'] as const

