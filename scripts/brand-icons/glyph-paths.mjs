/**
 * Canonical N glyph geometry (512 artboard).
 * Optically centered: ~8px right, ~12px down from mathematical center.
 * Stroke width 62 on 300px-tall letter; notification variant is ~10% heavier.
 */

/** Dark N for launcher / master mark (#111827) — diagonal band overlaps stems */
export const N_GLYPH_D =
  'M158 118H220V418H158Z M324 118H386V418H324Z M291 107L357 130L253 430L187 407Z'

/** Heavier white N for Android notification small icon (+10% stroke) */
export const N_GLYPH_NOTIFICATION_D =
  'M155 118H225V418H155Z M319 118H389V418H319Z M287 107L361 132L251 430L177 405Z'

/** Maskable safe-zone scale (fits 66% center circle on 512 canvas) */
export const MASKABLE_GLYPH_SCALE = 0.88

/** Optical nudge baked into path coordinates (see N_GLYPH_D). */
export const GLYPH_CENTER = { x: 272, y: 268 }
