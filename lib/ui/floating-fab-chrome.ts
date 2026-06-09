export function isSheetOpen(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.hasAttribute('data-sheet-open')
}

export function isMiniPlayerVisible(): boolean {
  if (typeof document === 'undefined') return false
  return document.querySelector('[data-youtube-mini-player]') instanceof HTMLElement
}

export function getMiniPlayerDockSide(): 'left' | 'right' | 'center' | null {
  if (typeof document === 'undefined') return null
  const player = document.querySelector('[data-youtube-mini-player]')
  if (!(player instanceof HTMLElement)) return null
  const side = player.getAttribute('data-dock-side')
  if (side === 'left' || side === 'right' || side === 'center') return side
  return null
}
