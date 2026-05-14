/**
 * Legacy nugget-card media hover: subtle image zoom inside a clipped region.
 * Compose with `overflow-hidden` on the aspect container and `group/media` on
 * the interactive wrapper. Uses Tailwind utilities only (GPU-friendly transform).
 */
export const cardMediaGroupClasses = 'group/media cursor-pointer'

export const cardMediaImageHoverClasses =
  'transition-transform duration-300 motion-reduce:transition-none motion-reduce:group-hover/media:scale-100 group-hover/media:scale-105'
