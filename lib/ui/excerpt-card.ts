export function isYouTubeUrl(url: string | null): boolean {
  if (!url) return false
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return h === 'youtube.com' || h === 'youtu.be' || h === 'm.youtube.com'
  } catch {
    return false
  }
}
