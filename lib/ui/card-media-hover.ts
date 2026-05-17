/**
 * Legacy nugget-card media hover: subtle image zoom inside a clipped region.
 * Compose with `overflow-hidden` on the aspect container and `group/media` on
 * the interactive wrapper. Uses Tailwind utilities only (GPU-friendly transform).
 */
export const cardMediaGroupClasses = 'group/media cursor-pointer'

export const cardMediaImageHoverClasses =
  'transition-transform duration-300 motion-reduce:transition-none motion-reduce:group-hover/media:scale-100 group-hover/media:scale-105'

/** YouTube posters and multi-image grid cells — fill frame edge-to-edge. */
export function cardMediaCoverImageClasses(imageHover = false): string {
  return `object-cover${imageHover ? ` ${cardMediaImageHoverClasses}` : ''}`
}

/** Uploaded/screenshot heroes — letterbox inside 16:9 frame (no crop). */
export function cardMediaContainImageClasses(imageHover = false): string {
  return `max-h-full max-w-full h-auto w-auto object-contain${imageHover ? ` ${cardMediaImageHoverClasses}` : ''}`
}
