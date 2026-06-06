import { NUGGETS_GLYPH_PATH, NUGGETS_LOGO_GLYPH, NUGGETS_LOGO_TILE } from '@/lib/brand/glyph'

type NuggetsLogoMarkProps = {
  /** Outer tile size in px (default 36 — header). */
  size?: number
  className?: string
}

/** Yellow tile + geometric N — matches favicon / app icon. Server Component. */
export function NuggetsLogoMark({ size = 36, className = '' }: NuggetsLogoMarkProps) {
  const radius = size * 0.1875
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: NUGGETS_LOGO_TILE,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 512 512" width={size * 0.62} height={size * 0.62} fill="none">
        <path d={NUGGETS_GLYPH_PATH} fill={NUGGETS_LOGO_GLYPH} />
      </svg>
    </span>
  )
}
