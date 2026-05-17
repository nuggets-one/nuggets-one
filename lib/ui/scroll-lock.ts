/**
 * iOS-safe background scroll lock. Reference-counted so nested overlays
 * (sheet + filter dialog) can lock/unlock without fighting each other.
 */

let lockCount = 0
let savedScrollY = 0

export function lockScroll(): () => void {
  lockCount += 1

  if (lockCount === 1) {
    savedScrollY = window.scrollY
    const { style: htmlStyle } = document.documentElement
    const { style: bodyStyle } = document.body

    htmlStyle.overflow = 'hidden'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${savedScrollY}px`
    bodyStyle.left = '0'
    bodyStyle.right = '0'
    bodyStyle.width = '100%'
    bodyStyle.overflow = 'hidden'
  }

  return unlockScroll
}

export function unlockScroll(): void {
  if (lockCount === 0) return

  lockCount -= 1

  if (lockCount > 0) return

  const { style: htmlStyle } = document.documentElement
  const { style: bodyStyle } = document.body
  const scrollY = savedScrollY

  htmlStyle.overflow = ''
  bodyStyle.position = ''
  bodyStyle.top = ''
  bodyStyle.left = ''
  bodyStyle.right = ''
  bodyStyle.width = ''
  bodyStyle.overflow = ''

  window.scrollTo(0, scrollY)
}
