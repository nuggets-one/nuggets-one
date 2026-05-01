export function isYouTubeUrl(url: string | null): boolean {
  if (!url) return false
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return h === 'youtube.com' || h === 'youtu.be' || h === 'm.youtube.com'
  } catch {
    return false
  }
}

/** Card hero fallback — `HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` Phase 2 (C1) */
export function youTubePosterHqUrl(videoId: string): string {
  const id = videoId.trim()
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
}
