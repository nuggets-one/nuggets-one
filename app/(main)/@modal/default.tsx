// Required for the intercepted nugget detail shell — without this default,
// the @modal slot leaks into direct URL hits instead of letting
// /nuggets/[id]/[slug] render as the full page route.
export default function Default() {
  return null
}
